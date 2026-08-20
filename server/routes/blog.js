const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const { query } = require('../config/database');
const { adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadImage } = require('../services/storage');

const POST_TEMPLATE_PATH = path.join(
  __dirname,
  '../../public/post.html'
);

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper function to safely update or append meta tags in HTML
function setMetaTag(html, attr, attrName, content) {
  const regex = new RegExp(
    `<meta\\s+[^>]*${attr}=["']${attrName}["'][^>]*\\/?>`,
    'i'
  );

  const escapedContent = escapeHtml(content);

  if (regex.test(html)) {
    return html.replace(regex, (existingTag) => {
      /*
       * Keep ALL existing attributes such as:
       *
       * id="meta-description"
       * id="og-title"
       * id="og-description"
       * id="og-image"
       * id="og-url"
       * id="twitter-title"
       * id="twitter-description"
       * id="twitter-image"
       * etc.
       *
       * Only replace the content value.
       */

      if (/content\s*=/i.test(existingTag)) {
        return existingTag.replace(
          /content\s*=\s*["'][^"']*["']/i,
          `content="${escapedContent}"`
        );
      }

      return existingTag.replace(
        /\/?>$/,
        ` content="${escapedContent}"$&`
      );
    });
  }

  /*
   * If the meta tag does not already exist,
   * create it normally.
   */
  const newTag =
    `<meta ${attr}="${attrName}" content="${escapedContent}" />`;

  return html.replace(
    '</head>',
    `  ${newTag}\n</head>`
  );
}

// 1. GET /posts
router.get(['/posts', '/'], async (req, res) => {
  try {
    const result = await query(`
      SELECT
        p.*,

        COALESCE(l.likes_count, 0)::INTEGER AS like_count,

        COALESCE(c.comment_count, 0)::INTEGER AS comment_count,

        cat.name AS category_name,
        cat.slug AS category_slug,

        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id', t.id,
              'name', t.name,
              'slug', t.slug
            )
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS tags

      FROM public.blog_posts p

      LEFT JOIN (
        SELECT
          post_id,
          COUNT(*) AS likes_count
        FROM public.blog_likes
        GROUP BY post_id
      ) l
        ON l.post_id = p.id

      LEFT JOIN (
        SELECT
          post_id,
          COUNT(*) AS comment_count
        FROM public.blog_comments
        GROUP BY post_id
      ) c
        ON c.post_id = p.id

      LEFT JOIN public.blog_categories cat
        ON cat.id = p.category_id

      LEFT JOIN public.blog_post_tags pt
        ON pt.post_id = p.id

      LEFT JOIN public.blog_tags t
        ON t.id = pt.tag_id

      WHERE p.status = 'published'

      GROUP BY
        p.id,
        l.likes_count,
        c.comment_count,
        cat.name,
        cat.slug

      ORDER BY
        COALESCE(p.published_at, p.created_at) DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error('Failed to load blog posts:', err);

    res.status(500).json({
      error: 'Unable to load blog posts'
    });
  }
});

// 2. POST /posts
router.post('/posts', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const {
      title,
      excerpt,
      content,
      category_id,
      tags,
      featured,
      status
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    const cleanTitle = (title || 'Untitled Post').trim();

    // ---------------------------------------------------------
    // Generate a readable URL slug automatically
    // ---------------------------------------------------------
    let baseSlug = cleanTitle
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!baseSlug) {
      baseSlug = 'blog-post';
    }

    let slug = baseSlug;
    let slugNumber = 2;

    while (true) {
      const existingSlug = await query(
        `
        SELECT id
        FROM public.blog_posts
        WHERE slug = $1
        LIMIT 1
        `,
        [slug]
      );

      if (existingSlug.rowCount === 0) {
        break;
      }

      slug = `${baseSlug}-${slugNumber}`;
      slugNumber++;
    }

    // ---------------------------------------------------------
    // Upload cover image
    // ---------------------------------------------------------
    let imageUrl = null;

    if (req.file) {
      imageUrl = await uploadImage(req.file);
    }

    // ---------------------------------------------------------
    // Validate status
    // ---------------------------------------------------------
    const postStatus =
      status === 'draft'
        ? 'draft'
        : 'published';

    const isFeatured =
      featured === 'true' ||
      featured === 'on' ||
      featured === '1' ||
      featured === true;

    // ---------------------------------------------------------
    // Publication date
    // ---------------------------------------------------------
    const publishedAt =
      postStatus === 'published'
        ? new Date()
        : null;

    // ---------------------------------------------------------
    // Create post
    // ---------------------------------------------------------
    const postResult = await query(
      `
      INSERT INTO public.blog_posts
      (
        title,
        slug,
        excerpt,
        content,
        image_url,
        category_id,
        status,
        featured,
        published_at,
        updated_at
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        CURRENT_TIMESTAMP
      )
      RETURNING *
      `,
      [
        cleanTitle,
        slug,
        excerpt?.trim() || null,
        content.trim(),
        imageUrl,
        category_id ? parseInt(category_id, 10) : null,
        postStatus,
        isFeatured,
        publishedAt
      ]
    );

    const post = postResult.rows[0];

    // ---------------------------------------------------------
    // Attach tags
    // ---------------------------------------------------------
    let parsedTags = [];

    if (tags) {
      try {
        parsedTags =
          typeof tags === 'string'
            ? JSON.parse(tags)
            : tags;
      } catch {
        parsedTags = [];
      }
    }

    if (Array.isArray(parsedTags)) {
      for (const tagId of parsedTags) {
        const parsedTagId = parseInt(tagId, 10);

        if (!Number.isInteger(parsedTagId)) {
          continue;
        }

        await query(
          `
          INSERT INTO public.blog_post_tags
            (post_id, tag_id)
          VALUES
            ($1, $2)
          ON CONFLICT DO NOTHING
          `,
          [post.id, parsedTagId]
        );
      }
    }

    // ---------------------------------------------------------
    // Return complete post
    // ---------------------------------------------------------
    res.status(201).json({
      success: true,
      message:
        postStatus === 'draft'
          ? 'Post saved as draft'
          : 'Post published successfully',
      data: post
    });

  } catch (err) {
    console.error('Creating blog post failed:', err);

    res.status(500).json({
      success: false,
      error: err.message || 'Failed to create blog post'
    });
  }
});

// 3. GET /categories
router.get('/categories', async (req, res) => {
  try {
    const result = await query(`
      SELECT *
      FROM public.blog_categories
      ORDER BY name ASC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error('Failed to load categories:', err);

    res.status(500).json({
      error: 'Unable to load categories'
    });
  }
});

// 4. GET /tags
router.get('/tags', async (req, res) => {
  try {
    const result = await query(`
      SELECT *
      FROM public.blog_tags
      ORDER BY name ASC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error('Failed to load tags:', err);

    res.status(500).json({
      error: 'Unable to load tags'
    });
  }
});

// 5. GET /posts/:postId
router.get(['/posts/:postId', '/:postId'], async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);

    if (!Number.isInteger(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    const result = await query(`
      SELECT
        p.*,

        COALESCE(l.likes_count, 0)::INTEGER AS like_count,

        COALESCE(c.comment_count, 0)::INTEGER AS comment_count,

        cat.name AS category_name,
        cat.slug AS category_slug,

        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id', t.id,
              'name', t.name,
              'slug', t.slug
            )
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS tags

      FROM public.blog_posts p

      LEFT JOIN (
        SELECT
          post_id,
          COUNT(*) AS likes_count
        FROM public.blog_likes
        GROUP BY post_id
      ) l
        ON l.post_id = p.id

      LEFT JOIN (
        SELECT
          post_id,
          COUNT(*) AS comment_count
        FROM public.blog_comments
        GROUP BY post_id
      ) c
        ON c.post_id = p.id

      LEFT JOIN public.blog_categories cat
        ON cat.id = p.category_id

      LEFT JOIN public.blog_post_tags pt
        ON pt.post_id = p.id

      LEFT JOIN public.blog_tags t
        ON t.id = pt.tag_id

      WHERE p.id = $1

      GROUP BY
        p.id,
        l.likes_count,
        c.comment_count,
        cat.name,
        cat.slug
    `, [postId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to load blog post:', err);
    res.status(500).json({ error: 'Unable to load blog post' });
  }
});

// 6. GET /render/:postId
router.get('/render/:postId', async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);

    if (!Number.isInteger(postId)) {
      return res.status(400).send('Invalid post ID');
    }

    const result = await query(
      `
      SELECT
        p.*,
        COALESCE(l.like_count, 0) AS like_count,
        COALESCE(c.comment_count, 0) AS comment_count
      FROM public.blog_posts p
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS like_count
        FROM public.blog_likes
        WHERE post_id = $1
        GROUP BY post_id
      ) l ON l.post_id = p.id
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS comment_count
        FROM public.blog_comments
        WHERE post_id = $1
        GROUP BY post_id
      ) c ON c.post_id = p.id
      WHERE p.id = $1
      `,
      [postId]
    );

    if (result.rowCount === 0) {
      return res.status(404).send('Post not found');
    }

    const post = result.rows[0];

    const title = post.title || 'Craig Mzumara Blog';
    const description = String(
      post.excerpt ||
      post.content ||
      'Read this post by Craig Mzumara.'
    )
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 160);

    const image =
      post.image_url ||
      'https://res.cloudinary.com/v1nymi7j/image/upload/v1786309580/hero-me.png';

    const postUrl = `https://craig-mzumara.web.app/post/${postId}`;

    let postHtml = fs.readFileSync(POST_TEMPLATE_PATH, 'utf8');

    // 1. Template Placeholder Replacements
    postHtml = postHtml
      .replace(/%POST_TITLE%/g, escapeHtml(title))
      .replace(/%POST_DESCRIPTION%/g, escapeHtml(description))
      .replace(/%POST_IMAGE%/g, escapeHtml(image))
      .replace(/%POST_URL%/g, escapeHtml(postUrl))
      .replace(/%POST_ID%/g, String(postId))
      .replace(/%POST_CONTENT%/g, escapeHtml(post.content || ''))
      .replace(/%POST_CREATED_AT%/g, escapeHtml(new Date(post.created_at).toLocaleDateString()))
      .replace(/%POST_LIKE_COUNT%/g, String(post.like_count || 0))
      .replace(/%POST_COMMENT_COUNT%/g, String(post.comment_count || 0));

    // 2. Explicit Title Injection
    postHtml = postHtml.replace(
      /<title[^>]*>[\s\S]*?<\/title>/i,
      `<title id="page-title">${escapeHtml(title)}</title>`
    );

    // 3. Reliable Open Graph & Twitter Tag Injection
    postHtml = setMetaTag(postHtml, 'name', 'description', description);
    postHtml = setMetaTag(postHtml, 'property', 'og:title', title);
    postHtml = setMetaTag(postHtml, 'property', 'og:description', description);
    postHtml = setMetaTag(postHtml, 'property', 'og:image', image);
    postHtml = setMetaTag(postHtml, 'property', 'og:url', postUrl);
    postHtml = setMetaTag(postHtml, 'property', 'og:type', 'article');
    postHtml = setMetaTag(postHtml, 'property', 'og:image:alt', title);

    postHtml = setMetaTag(postHtml, 'name', 'twitter:card', 'summary_large_image');
    postHtml = setMetaTag(postHtml, 'name', 'twitter:title', title);
    postHtml = setMetaTag(postHtml, 'name', 'twitter:description', description);
    postHtml = setMetaTag(postHtml, 'name', 'twitter:image', image);
    postHtml = setMetaTag(postHtml, 'name', 'twitter:image:alt', title);
    postHtml = setMetaTag(postHtml, 'name', 'twitter:url', postUrl);

    // 4. Canonical Link Tag Injection
    const canonicalRegex = /<link\s+[^>]*rel=["']canonical["'][^>]*\/>/gi;
    const newCanonicalTag = `<link rel="canonical" id="canonical-url" href="${escapeHtml(postUrl)}" />`;

    if (canonicalRegex.test(postHtml)) {
      postHtml = postHtml.replace(canonicalRegex, newCanonicalTag);
    } else {
      postHtml = postHtml.replace('</head>', `  ${newCanonicalTag}\n</head>`);
    }

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.send(postHtml);

  } catch (err) {
    console.error('Failed to render post view:', err);
    res.status(500).send('Unable to render post');
  }
});

module.exports = router;