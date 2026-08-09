CREATE TABLE public.page_images (
    id SERIAL PRIMARY KEY,
    section VARCHAR(50) NOT NULL,
    element_id VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(100),
    image_url TEXT NOT NULL,
    subtitle VARCHAR(255),
    badge VARCHAR(50) DEFAULT 'Mobile Shot',
    tech_tags TEXT,
    live_demo_url TEXT,
    github_url TEXT,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.blog_posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.blog_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES public.blog_posts(id) ON DELETE CASCADE,
    author_name VARCHAR(100) NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.blog_likes (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES public.blog_posts(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    CONSTRAINT blog_likes_post_id_session_id_key UNIQUE (post_id, session_id)
);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact VARCHAR(255) NOT NULL,
  service VARCHAR(255),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);