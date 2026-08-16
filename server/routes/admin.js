const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadImage } = require('../services/storage');

router.post('/upload-image', adminAuth, upload.single('image'), async (req, res) => {
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

router.delete('/blog/posts/:postId', adminAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);

    await query('DELETE FROM public.blog_likes WHERE post_id = $1', [postId]);
    await query('DELETE FROM public.blog_comments WHERE post_id = $1', [postId]);

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

module.exports = router;