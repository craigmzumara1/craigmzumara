const functions = require("firebase-functions");
const fs = require("fs");
const path = require("path");

const RAILWAY_API = "https://craigmzumara-production.up.railway.app";

exports.renderPost = functions.https.onRequest(async (req, res) => {
  const pathParts = req.path.split("/").filter(Boolean);
  const postId = pathParts[pathParts.length - 1];

  const htmlPath = path.join(__dirname, "../public/post.html");
  let html = fs.readFileSync(htmlPath, "utf8");

  let title = "Craig Mzumara – Creative & Student";
  let description = "Portfolio and blog of Craig Mzumara.";
  let image = "https://craig-mzumara.web.app/images/default-og.jpg";

  if (postId && /^\d+$/.test(postId)) {
    try {
      const response = await fetch(`${RAILWAY_API}/api/blog/posts/${postId}`);
      if (response.ok) {
        const post = await response.json();
        title = post.title || title;
        description = post.summary || post.excerpt || description;
        image = post.cover_image || post.image_url || image;
      }
    } catch (err) {
      console.error("Failed to fetch post metadata from Railway:", err);
    }
  }

  const ogTags = `
    <title>${title} — Craig Mzumara</title>
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
  `;

  html = html.replace("</head>", `${ogTags}</head>`);

  res.set("Cache-Control", "public, max-age=300, s-maxage=600");
  res.status(200).send(html);
});