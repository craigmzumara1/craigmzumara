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
const path = require('path');
const cors = require('cors');

const { adminAuth } = require('./server/middleware/auth');
const imagesRoutes = require('./server/routes/images');
const adminRoutes = require('./server/routes/admin');
const blogRoutes = require('./server/routes/blog');
const contactRoutes = require('./server/routes/contact');
const likesRoutes = require('./server/routes/likes');
const commentsRoutes = require('./server/routes/comments');

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: [
  'https://craig-mzumara.web.app',
  'http://localhost:3000'
],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/admin.html', adminAuth);
app.use('/api/admin', adminAuth, adminRoutes);

const staticSetHeaders = (res, filePath) => {
  if (filePath.endsWith('.webp')) {
    res.setHeader('Content-Type', 'image/webp');
  }
};

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { setHeaders: staticSetHeaders }));
app.use(express.static(publicDir, { setHeaders: staticSetHeaders }));

app.use('/api/images', imagesRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/blog', likesRoutes);
app.use('/api/blog', commentsRoutes);

// Fallback compatibility route aliases for legacy frontend endpoints
app.get(['/api/posts', '/api/posts/*'], (req, res) => {
  const targetPath = req.path.replace('/api/posts', '/api/blog/posts');
  res.redirect(307, targetPath);
});

app.get(['/post/:postId', '/blog/:postId'], (req, res) => {
  res.redirect(301, `/api/blog/render/${req.params.postId}`);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
  }
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL is missing.');
  }
});