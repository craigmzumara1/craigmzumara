const { onRequest } = require("firebase-functions/v2/https");

const RAILWAY_RENDER_BASE =
  "https://craigmzumara-production.up.railway.app/api/blog/render";

exports.post = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "256MiB"
  },
  async (req, res) => {
    const match = String(req.path || "").match(/^\/?post\/(\d+)\/?$/);

    if (!match) {
      return res.status(404).send("Post not found");
    }

    const postId = match[1];
    const upstreamUrl = `${RAILWAY_RENDER_BASE}/${postId}`;

    try {
      const upstream = await fetch(upstreamUrl, {
        method: "GET",
        headers: {
          Accept: "text/html"
        }
      });

      const html = await upstream.text();

      res.status(upstream.status);
      res.set("Content-Type", "text/html; charset=utf-8");
      res.set(
        "Cache-Control",
        "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
      );
      return res.send(html);
    } catch (error) {
      console.error("Firebase post proxy failed:", error);
      return res.status(502).send("Unable to load post");
    }
  }
);
