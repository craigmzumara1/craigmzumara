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
const authRoutes = require('./server/routes/auth');
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

const allowedOrigins = [
  "https://craig-mzumara.web.app",
  "https://craig-mzumara.firebaseapp.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

app.use(
  cors({
    origin: function (origin, callback) {

      /*
       * Requests without an Origin header are allowed.
       * This includes server-to-server requests.
       */
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(
        "CORS blocked origin:",
        origin
      );

      return callback(
        new Error(
          `CORS blocked origin: ${origin}`
        )
      );
    },

    /*
     * We are using HTTP Basic Auth,
     * not cookies/session authentication.
     */
    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS"
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ],

    optionsSuccessStatus: 204
  })
);

app.options("*", cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(
      new Error(`CORS blocked origin: ${origin}`)
    );
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS"
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept"
  ],

  optionsSuccessStatus: 204
}));

/*
 * Authentication routes
 */
app.use('/api/auth', authRoutes);

/*
 * Admin authentication
 */
app.use('/admin.html', adminAuth);
app.use('/api/admin', adminAuth, adminRoutes);

/*
 * Static file headers
 */
const staticSetHeaders = (res, filePath) => {
  if (filePath.endsWith('.webp')) {
    res.setHeader('Content-Type', 'image/webp');
  }
};

/*
 * Uploaded files
 */
app.use(
  '/uploads',
  express.static(
    path.join(__dirname, 'uploads'),
    {
      setHeaders: staticSetHeaders
    }
  )
);

/*
 * ============================================================
 * PUBLIC BLOG POST ROUTE
 * ============================================================
 *
 * This fixes:
 *
 *     Cannot GET /post/27
 *
 * The existing blog router already contains:
 *
 *     GET /render/:postId
 *
 * which generates the complete server-rendered post page
 * including:
 *
 * - title
 * - description
 * - Open Graph title
 * - Open Graph description
 * - Open Graph image
 * - Open Graph URL
 * - Twitter card
 * - Twitter title
 * - Twitter description
 * - Twitter image
 * - canonical URL
 *
 * Instead of creating another renderer, we internally rewrite:
 *
 *     /post/27
 *
 * to:
 *
 *     /render/27
 *
 * and let the existing blog renderer handle it.
 */
app.get('/post/:id', (req, res, next) => {
  const postId = req.params.id;

  /*
   * Make sure the ID is numeric before passing it
   * to the existing blog renderer.
   */
  if (!/^\d+$/.test(postId)) {
    return res.status(400).send('Invalid post ID');
  }

  /*
   * The blog router expects:
   *
   *     /render/:postId
   *
   * so change the URL internally before passing the
   * request into that router.
   */
  req.url = `/render/${postId}`;

  blogRoutes(req, res, next);
});

/*
 * Static frontend files
 */
app.use(
  express.static(
    publicDir,
    {
      setHeaders: staticSetHeaders
    }
  )
);

/*
 * API routes
 */
app.use('/api/images', imagesRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/blog', likesRoutes);
app.use('/api/blog', commentsRoutes);

/*
 * Fallback compatibility route aliases for legacy frontend endpoints
 */
app.get(['/api/posts', '/api/posts/*'], (req, res) => {
  const targetPath = req.path.replace(
    '/api/posts',
    '/api/blog/posts'
  );

  res.redirect(307, targetPath);
});

/*
 * Start server
 */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  if (
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.warn(
      'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.'
    );
  }

  if (!process.env.DATABASE_URL) {
    console.warn(
      'DATABASE_URL is missing.'
    );
  }
});