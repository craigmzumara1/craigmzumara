const path = require('path');
const crypto = require('crypto');
const { supabase, SUPABASE_STORAGE_BUCKET } = require('../config/supabase');

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

module.exports = { uploadImage };