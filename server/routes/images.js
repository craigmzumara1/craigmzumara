const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM public.page_images ORDER BY updated_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load images:', err);
    res.status(500).json({ error: 'Unable to load images' });
  }
});

module.exports = router;