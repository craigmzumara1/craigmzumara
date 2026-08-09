require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;
const publicDir = path.join(__dirname);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

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
app.use(express.static(publicDir));

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

app.get('/api/blog/posts', async (req, res) => {
  try {
    const result = await query('SELECT * FROM public.blog_posts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load blog posts:', err);
    res.status(500).json({ error: 'Unable to load blog posts' });
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
    const likesCount = parseInt(countResult.rows[0].likes_count, 10);

    res.json({ success: true, likes_count: likesCount });
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

    res.json({ success: true });
  } catch (err) {
    console.error('Create comment failed:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create comment' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at ${SERVER_URL}`);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Storage upload functionality will not work until these are set.');
  }
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL is missing. Database functionality will not work until DATABASE_URL is set.');
  }
});
