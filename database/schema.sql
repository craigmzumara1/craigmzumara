-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.page_images (
  id integer NOT NULL DEFAULT nextval('page_images_id_seq'::regclass),
  section character varying NOT NULL,
  element_id character varying NOT NULL UNIQUE,
  title character varying,
  image_url text,
  subtitle character varying,
  badge character varying DEFAULT 'Mobile Shot'::character varying,
  tech_tags text,
  live_demo_url text,
  github_url text,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT page_images_pkey PRIMARY KEY (id)
);
CREATE TABLE public.blog_posts (
  id integer NOT NULL DEFAULT nextval('blog_posts_id_seq'::regclass),
  title character varying NOT NULL,
  content text NOT NULL,
  image_url text,
  likes_count integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  slug text,
  excerpt text,
  status character varying DEFAULT 'published'::character varying,
  featured boolean DEFAULT false,
  published_at timestamp without time zone,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  category_id integer,
  CONSTRAINT blog_posts_pkey PRIMARY KEY (id),
  CONSTRAINT blog_posts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.blog_categories(id)
);
CREATE TABLE public.blog_comments (
  id integer NOT NULL DEFAULT nextval('blog_comments_id_seq'::regclass),
  post_id integer,
  author_name character varying NOT NULL,
  comment_text text NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT blog_comments_pkey PRIMARY KEY (id),
  CONSTRAINT blog_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.blog_posts(id)
);
CREATE TABLE public.blog_likes (
  id integer NOT NULL DEFAULT nextval('blog_likes_id_seq'::regclass),
  post_id integer,
  session_id character varying NOT NULL,
  CONSTRAINT blog_likes_pkey PRIMARY KEY (id),
  CONSTRAINT blog_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.blog_posts(id)
);
CREATE TABLE public.contact_messages (
  id integer NOT NULL DEFAULT nextval('contact_messages_id_seq'::regclass),
  name character varying NOT NULL,
  contact character varying NOT NULL,
  service character varying,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT contact_messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.blog_categories (
  id integer NOT NULL DEFAULT nextval('blog_categories_id_seq'::regclass),
  name character varying NOT NULL UNIQUE,
  slug character varying NOT NULL UNIQUE,
  description text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT blog_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.blog_tags (
  id integer NOT NULL DEFAULT nextval('blog_tags_id_seq'::regclass),
  name character varying NOT NULL UNIQUE,
  slug character varying NOT NULL UNIQUE,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT blog_tags_pkey PRIMARY KEY (id)
);
CREATE TABLE public.blog_post_tags (
  post_id integer NOT NULL,
  tag_id integer NOT NULL,
  CONSTRAINT blog_post_tags_pkey PRIMARY KEY (post_id, tag_id),
  CONSTRAINT blog_post_tags_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.blog_posts(id),
  CONSTRAINT blog_post_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.blog_tags(id)
);