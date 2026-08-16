const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

router.post('/posts/:postId/like', async (req, res) => {
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

module.exports = router;