const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

router.post('/', async (req, res) => {
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

module.exports = router;