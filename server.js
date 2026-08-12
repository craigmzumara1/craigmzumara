/*
 * Copyright 2026 Craig Mzumara
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

require('dotenv').config();
const express = require('express');
const basicAuth = require('express-basic-auth');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cors = require('cors');

const PORT = process.env.PORT || 3000;
const SERVER_URL = process.env.SERVER_URL || 'https://craigmzumara-production.up.railway.app';
const publicDir = path.join(__dirname);
const POST_TEMPLATE_PATH = path.join(__dirname, 'post.html');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const adminAuth = basicAuth({
  users: { 'craigmzumara1': ADMIN_PASSWORD },
  challenge: true,
  unauthorizedResponse: req => req.auth ? 'Credentials rejected' : 'No credentials provided'
});

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allow requests from all frontend origins (Netlify, Localhost, etc.)
app.use(cors({
  origin: ['https://craigmzumara.netlify.app', 'http://localhost:3000'],
  credentials: true
}));

app.use('/admin.html', adminAuth);
app.use('/api/admin', adminAuth);

const staticSetHeaders = (res, filePath) => {
  if (filePath.endsWith('.webp')) {
    res.setHeader('Content-Type', 'image/webp');
  }
};

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { setHeaders: staticSetHeaders }));
app.use(express.static(publicDir, { setHeaders: staticSetHeaders }));

async function uploadImage(file) {
  if (!supabase) {
    throw new Error('Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._\-]/g, '_');
  const filename = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const storagePath = `site/${filename}`;

  const { data, error } = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(storagePath, file.buffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.mimetype
    });

  if (error) {
    throw error;
  }

  const { data: urlData, error: urlError } = supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  if (urlError) {
    throw urlError;
  }

  return urlData.publicUrl;
}

async function query(text, params = []) {
  if (!pool) {
    throw new Error('Database is not configured. Set DATABASE_URL.');
  }
  return pool.query(text, params);
}

app.get('/api/images', async (req, res) => {
  try {
    const result = await query('SELECT * FROM public.page_images ORDER BY updated_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load images:', err);
    res.status(500).json({ error: 'Unable to load images' });
  }
});

app.post('/api/admin/upload-image', upload.single('image'), async (req, res) => {
  try {
    const section = req.body.section || 'portfolio';
    const element_id = req.body.element_id || `img-${Date.now()}`;
    const title = req.body.title || null;
    const subtitle = req.body.subtitle || null;
    const badge = req.body.badge || null;
    const tech_tags = req.body.tech_tags || null;
    const live_demo_url = req.body.live_demo_url || null;
    const github_url = req.body.github_url || null;

    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadImage(req.file);
    }

    const queryText = `
      INSERT INTO public.page_images
        (section, element_id, title, subtitle, image_url, badge, tech_tags, live_demo_url, github_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (element_id)
      DO UPDATE SET
        section = EXCLUDED.section,
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        image_url = COALESCE(EXCLUDED.image_url, public.page_images.image_url),
        badge = EXCLUDED.badge,
        tech_tags = EXCLUDED.tech_tags,
        live_demo_url = EXCLUDED.live_demo_url,
        github_url = EXCLUDED.github_url,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const result = await query(queryText, [
      section,
      element_id,
      title,
      subtitle,
      imageUrl,
      badge,
      tech_tags,
      live_demo_url,
      github_url
    ]);

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Admin upload failed:', err);
    res.status(500).json({ success: false, error: err.message || 'Admin upload failed' });
  }
});

app.post('/api/blog/posts', upload.single('image'), async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadImage(req.file);
    }

    const result = await query(
      'INSERT INTO public.blog_posts (title, content, image_url) VALUES ($1, $2, $3) RETURNING *',
      [title || null, content, imageUrl]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Creating blog post failed:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create blog post' });
  }
});

// ==========================================
// DELETE BLOG POST (ADMIN ROUTE)
// ==========================================
app.delete('/api/admin/blog/posts/:postId', adminAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);

    // 1. Clean up associated likes and comments first
    await query('DELETE FROM public.blog_likes WHERE post_id = $1', [postId]);
    await query('DELETE FROM public.blog_comments WHERE post_id = $1', [postId]);

    // 2. Delete the actual blog post
    const result = await query('DELETE FROM public.blog_posts WHERE id = $1 RETURNING *', [postId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Failed to delete post:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to delete post' });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, contact, service, message } = req.body;
    if (!name || !contact || !message) {
      return res.status(400).json({ success: false, error: 'name, contact, and message are required' });
    }

    const result = await query(
      'INSERT INTO public.contact_messages (name, contact, service, message) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, contact, service || null, message]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Contact submission failed:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to save contact message' });
  }
});

app.get(['/api/blog/posts', '/api/posts', '/api/blog'], async (req, res) => {
  try {
    const result = await query(`
      SELECT
        p.*,
        COALESCE(l.likes_count, 0) AS like_count,
        COALESCE(c.comment_count, 0) AS comment_count
      FROM public.blog_posts p
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS likes_count
        FROM public.blog_likes
        GROUP BY post_id
      ) l ON l.post_id = p.id
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS comment_count
        FROM public.blog_comments
        GROUP BY post_id
      ) c ON c.post_id = p.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load blog posts:', err);
    res.status(500).json({ error: 'Unable to load blog posts' });
  }
});

app.get(['/api/blog/posts/:postId', '/api/posts/:postId', '/api/blog/:postId'], async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    const result = await query(`
      SELECT
        p.*,
        COALESCE(l.likes_count, 0) AS like_count,
        COALESCE(c.comment_count, 0) AS comment_count
      FROM public.blog_posts p
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS likes_count
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

app.post('/api/blog/posts/:postId/like', async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    const { session_id } = req.body;
    if (!session_id) {
      return res.status(400).json({ success: false, error: 'session_id is required' });
    }

    await query(
      'INSERT INTO public.blog_likes (post_id, session_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [postId, session_id]
    );

    const countResult = await query('SELECT COUNT(*) AS likes_count FROM public.blog_likes WHERE post_id = $1', [postId]);
    const likeCount = parseInt(countResult.rows[0].likes_count, 10);

    await query('UPDATE public.blog_posts SET likes_count = $1 WHERE id = $2', [likeCount, postId]);

    res.json({ success: true, like_count: likeCount });
  } catch (err) {
    console.error('Like failed:', err);
    res.status(500).json({ success: false, error: err.message || 'Like failed' });
  }
});

app.get('/api/blog/posts/:postId/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    const result = await query(
      'SELECT id, author_name, comment_text, created_at FROM public.blog_comments WHERE post_id = $1 ORDER BY created_at ASC',
      [postId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load comments:', err);
    res.status(500).json({ error: 'Unable to load comments' });
  }
});

app.post('/api/blog/posts/:postId/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    const { author_name, comment_text } = req.body;
    if (!author_name || !comment_text) {
      return res.status(400).json({ success: false, error: 'author_name and comment_text are required' });
    }

    await query(
      'INSERT INTO public.blog_comments (post_id, author_name, comment_text) VALUES ($1, $2, $3)',
      [postId, author_name, comment_text]
    );

    const countResult = await query('SELECT COUNT(*) AS comment_count FROM public.blog_comments WHERE post_id = $1', [postId]);
    const commentCount = parseInt(countResult.rows[0].comment_count, 10);

    res.json({ success: true, comment_count: commentCount });
  } catch (err) {
    console.error('Create comment failed:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create comment' });
  }
});

app.get(['/post/:postId', '/blog/:postId'], async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    const result = await query(`
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
    `, [postId]);

    if (result.rowCount === 0) {
      return res.status(404).send('Post not found');
    }
    
    const post = result.rows[0];
    const postHtml = fs.readFileSync(POST_TEMPLATE_PATH, 'utf8')
      .replace(/%POST_TITLE%/g, escapeHtml(post.title || 'Blog Post'))
      .replace(/%POST_DESCRIPTION%/g, escapeHtml((post.content || '').substring(0, 150)))
      .replace(/%POST_IMAGE%/g, escapeHtml(post.image_url || 'https://craigmzumara-production.up.railway.app/og-default.png'))
      .replace(/%POST_URL%/g, `https://craigmzumara.netlify.app/post/${postId}`)
      .replace(/%POST_ID%/g, String(postId))
      .replace(/%POST_CONTENT%/g, escapeHtml(post.content || ''))
      .replace(/%POST_CREATED_AT%/g, escapeHtml(new Date(post.created_at).toLocaleDateString()))
      .replace(/%POST_LIKE_COUNT%/g, String(post.like_count || 0))
      .replace(/%POST_COMMENT_COUNT%/g, String(post.comment_count || 0));

    res.send(postHtml);
  } catch (err) {
    console.error('Failed to render post view:', err);
    res.status(500).send('Unable to render post');
  }
});

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
  }
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL is missing.');
  }
});