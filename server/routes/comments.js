const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

router.get('/posts/:postId/comments', async (req, res) => {
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

router.post('/posts/:postId/comments', async (req, res) => {
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

module.exports = router;