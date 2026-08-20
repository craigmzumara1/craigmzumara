# Craig Mzumara Portfolio

Welcome to the official repository for my personal portfolio and digital workspace! I am a full-stack web developer and visual creative based in Malawi, passionate about building fast, clean and functional web solutions.

## 🚀 About the Project
This portfolio serves as a hub for my web development projects, creative photography work, and digital services. It is designed to be a fast, responsive, and intuitive interface that showcases both my technical skills and my aesthetic sensibility.

## 🛠️ Tech Stack
This application is built with a modern web stack to ensure performance and scalability:

*   **Runtime:** Node.js & Express
*   **Database:** PostgreSQL (hosted on Supabase)
*   **Frontend:** HTML5, CSS3, & JavaScript
*   **Deployment:** Firebase Hosting
*   **Architecture:** Progressive Web App (PWA) & Mobile-First Design

## ✨ Key Features
- **Project Showcase:** Highlights full-stack applications like *Domasi Hub*, a campus utility platform.
- **Visual Arts Lab:** Interactive photography gallery featuring custom color grading comparisons.
- **Service Hub:** Dedicated sections for clients looking for Marketing, Educational, and Custom Web Applications.
- **Responsive Design:** Optimized for a seamless experience on both desktop and mobile devices.
- **Interactive Elements:** Dynamic theme toggling (Light/Dark mode) and smooth UI transitions.

## 📈 Current Focus
I am currently a student studying Mathematics and Computer Science, channeling my academic foundation into creating practical tools that solve real-world problems. My work combines:
- **Logical Programming:** Clean backend architecture and database management.
- **Creative Visuals:** Mobile photography and aesthetic color grading.

## 🔗 Connect With Me
*   **Email:** craigmzumaraofficial@gmail.com
*   **WhatsApp:** +265 995 38 96 65
*   **GitHub:** [craigmzumara](https://github.com/craigmzumara1)
*   **Website:** [ craig-mzumara.web.app/]( https://craig-mzumara.web.app/)
---


## Production admin authentication

The Firebase-hosted admin dashboard authenticates against Railway using a short-lived
HMAC-SHA256 JWT sent in the `Authorization: Bearer <token>` header.

Set these Railway environment variables:

```text
ADMIN_USERNAME=craigmzumara1
ADMIN_PASSWORD=<your-existing-admin-password>
ADMIN_JWT_SECRET=<long-random-secret>
ADMIN_JWT_EXPIRES_IN=12h
```

`ADMIN_JWT_SECRET` must be a strong random secret and must not be committed to GitHub.
The frontend stores the issued token only in `sessionStorage`, so the admin password is
never embedded in frontend JavaScript.

For local development, the existing HTTP Basic Auth fallback remains available when
the frontend and Express server are running on the same origin.
