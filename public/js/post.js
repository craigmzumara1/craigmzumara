
    /*
 * ========================================================
 * API CONFIGURATION
 * ========================================================
 */

window.API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://craigmzumara-production.up.railway.app";

    /* =========================================================
       POST ID
       ========================================================= */

    const urlParams = new URLSearchParams(window.location.search);

let POST_ID = urlParams.get("id") || "";

/*
 * Firebase serves /post/:id internally as /post.html.
 * The browser URL remains /post/:id, so read the ID from
 * the pathname first and fall back to ?id=123.
 */
const pathParts = window.location.pathname
  .split("/")
  .filter(Boolean);

const postIndex = pathParts.indexOf("post");

if (postIndex !== -1 && pathParts[postIndex + 1]) {
  POST_ID = pathParts[postIndex + 1];
}

POST_ID = String(POST_ID || "").trim();

/* Only accept positive integer post IDs. */
if (!/^\d+$/.test(POST_ID)) {
  POST_ID = "";
}

console.log("Loading post ID:", POST_ID);

/* =========================================================
       HELPERS
       ========================================================= */

    function escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function timeAgo(dateString) {
      const date = new Date(dateString);

      if (Number.isNaN(date.getTime())) {
        return "";
      }

      const now = new Date();

      const seconds = Math.floor(
        (now - date) / 1000
      );

      if (seconds < 60) {
        return "just now";
      }

      const minutes = Math.floor(seconds / 60);

      if (minutes < 60) {
        return `${minutes}m ago`;
      }

      const hours = Math.floor(minutes / 60);

      if (hours < 24) {
        return `${hours}h ago`;
      }

      const days = Math.floor(hours / 24);

      if (days < 7) {
        return `${days}d ago`;
      }

      return date.toLocaleDateString(
        undefined,
        {
          year: "numeric",
          month: "short",
          day: "numeric"
        }
      );
    }

    function getSessionId() {
      let sessionId =
        localStorage.getItem("blog_session_id");

      if (!sessionId) {
        sessionId =
          "sess_" +
          Math.random()
            .toString(36)
            .substring(2) +
          Date.now();

        localStorage.setItem(
          "blog_session_id",
          sessionId
        );
      }

      return sessionId;
    }

    function showToast(message) {
      const toast =
        document.getElementById("toast");

      toast.textContent = message;

      toast.classList.add("show");

      clearTimeout(window.toastTimer);

      window.toastTimer =
        setTimeout(() => {
          toast.classList.remove("show");
        }, 2800);
    }

    /* =========================================================
       LOAD POST
       ========================================================= */

    async function loadPost() {

  if (
    !POST_ID ||
    POST_ID === "%POST_ID%"
  ) {
    showPostError("No post ID was provided.");
    return;
  }

  try {

    const apiUrl =
      `${API_BASE_URL}/api/blog/posts/${encodeURIComponent(POST_ID)}`;

    console.log("Fetching post:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
      cache: "no-store"
    });

    const responseText =
      await response.text();

    if (!response.ok) {
      console.error(
        "Post API error:",
        response.status,
        responseText
      );

      throw new Error(
        `HTTP ${response.status}: ${responseText}`
      );
    }

    let post;

    try {
      post = JSON.parse(responseText);
    } catch (error) {
      console.error(
        "API returned non-JSON:",
        responseText
      );

      throw new Error(
        "The server returned an invalid response."
      );
    }

    if (
      !post ||
      typeof post !== "object" ||
      Array.isArray(post)
    ) {
      throw new Error(
        "Invalid post data received."
      );
    }

    console.log("Post loaded successfully:", post);

    window.currentPost = post;

    renderPost(post);

    /*
     * Load comments after the post itself
     * has successfully loaded.
     */
    loadComments();

  } catch (error) {

    console.error(
      "Failed to load post:",
      error
    );

    showPostError(
      "The requested blog post could not be loaded."
    );
  }
}
    /* =========================================================
       RENDER POST
       ========================================================= */

    function renderPost(post) {

      const title =
        post.title ||
        "Untitled Post";

      const content =
        post.content ||
        "";

      const description =
        content.length > 160
          ? content.substring(0, 157) + "..."
          : content ||
            "Read this post by Craig Mzumara.";

      const postUrl =
        `https://craig-mzumara.web.app/post/${encodeURIComponent(POST_ID)}`;

      /* Title */

      document.title =
        `${title} — Craig Mzumara`;

      document.getElementById(
        "page-title"
      ).textContent =
        `${title} — Craig Mzumara`;

      /* Meta */

      document
        .getElementById("meta-description")
        .setAttribute(
          "content",
          description
        );

      document
        .getElementById("og-title")
        .setAttribute(
          "content",
          title
        );

      document
        .getElementById("og-description")
        .setAttribute(
          "content",
          description
        );

      document
        .getElementById("og-url")
        .setAttribute(
          "content",
          postUrl
        );

      document
        .getElementById("twitter-title")
        .setAttribute(
          "content",
          title
        );

      document
        .getElementById("twitter-description")
        .setAttribute(
          "content",
          description
        );

      const canonical =
        document.getElementById("canonical-url");

      if (canonical) {
        canonical.setAttribute("href", postUrl);
      }

      /* Main content */

      document.getElementById(
        "post-title"
      ).textContent = title;

      document.getElementById(
        "breadcrumb-title"
      ).textContent = title;

      document.getElementById(
        "post-body"
      ).textContent = content;

      document.getElementById(
        "post-date"
      ).textContent =
        post.created_at
          ? new Date(
              post.created_at
            ).toLocaleDateString(
              undefined,
              {
                year: "numeric",
                month: "long",
                day: "numeric"
              }
            )
          : "Recently";

      document.getElementById(
        "post-like-count"
      ).textContent =
        post.like_count || 0;

      document.getElementById(
        "post-comment-count"
      ).textContent =
        post.comment_count || 0;

      /* Image */

      const imageContainer =
        document.getElementById(
          "post-image-container"
        );

      const image =
        document.getElementById(
          "post-image"
        );

      const socialImage =
        post.image_url ||
        "https://res.cloudinary.com/v1nymi7j/image/upload/v1786309580/hero-me.png";

      document
        .getElementById("og-image")
        .setAttribute(
          "content",
          socialImage
        );

      document
        .getElementById("twitter-image")
        .setAttribute(
          "content",
          socialImage
        );

      if (post.image_url) {

        image.src =
          post.image_url;

        image.alt =
          title;

        imageContainer.style.display =
          "block";

        image.onload = () => {
          image.classList.add(
            "loaded"
          );
        };

        if (image.complete) {
          image.classList.add(
            "loaded"
          );
        }

      } else {

        imageContainer.style.display =
          "none";
      }

      /* Tags */

      renderTags(post);
    }

    /* =========================================================
       TAGS
       ========================================================= */

   function renderTags(post) {

  const taxonomyContainer =
    document.getElementById("post-taxonomy");

  const categoryContainer =
    document.getElementById("post-category");

  const tagsContainer =
    document.getElementById("post-tags");

  if (!taxonomyContainer || !categoryContainer || !tagsContainer) {
    console.error("Taxonomy elements are missing from post.html.");
    return;
  }

  /* =========================================================
     CATEGORY
     ========================================================= */

  let category = "";

  /*
   * IMPORTANT:
   * The backend returns:
   *
   * category_name
   * category_slug
   *
   * NOT:
   *
   * category
   */

  if (typeof post.category_name === "string") {
    category = post.category_name.trim();
  }

  /*
   * Extra compatibility in case the API ever returns
   * category as an object.
   */

  if (!category && post.category && typeof post.category === "object") {
    category =
      post.category.name ||
      post.category.title ||
      post.category.slug ||
      "";
  }

  category = String(category || "").trim();

  if (category) {

    categoryContainer.textContent = category;

    categoryContainer.style.display = "inline-flex";

  } else {

    categoryContainer.textContent = "";

    categoryContainer.style.display = "none";
  }

  /* =========================================================
     TAGS
     ========================================================= */

  let tags = [];

  if (Array.isArray(post.tags)) {

    tags = post.tags;

  } else if (typeof post.tags === "string") {

    /*
     * Handle JSON string:
     * ["web", "javascript"]
     */

    try {

      const parsed = JSON.parse(post.tags);

      if (Array.isArray(parsed)) {
        tags = parsed;
      }

    } catch (error) {

      /*
       * Handle comma-separated string:
       * web,javascript,portfolio
       */

      tags = post.tags
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean);
    }
  }

  /*
   * Convert tag objects into names.
   *
   * Backend format:
   *
   * {
   *   id: 1,
   *   name: "JavaScript",
   *   slug: "javascript"
   * }
   */

  tags = tags
    .map(tag => {

      if (typeof tag === "string") {
        return tag.trim();
      }

      if (tag && typeof tag === "object") {

        return (
          tag.name ||
          tag.title ||
          tag.slug ||
          ""
        ).toString().trim();
      }

      return "";
    })
    .filter(Boolean);

  /*
   * Remove duplicate tags.
   */

  tags = [...new Set(tags)];

  /* =========================================================
     DISPLAY TAGS
     ========================================================= */

  if (tags.length > 0) {

    tagsContainer.innerHTML = tags
      .map(tag => {

        return `
          <span class="post-tag">
            #${escapeHtml(tag)}
          </span>
        `;

      })
      .join("");

    tagsContainer.style.display = "flex";

  } else {

    tagsContainer.innerHTML = "";

    tagsContainer.style.display = "none";
  }

  /* =========================================================
     SHOW / HIDE TAXONOMY
     ========================================================= */

  const hasCategory =
    Boolean(category);

  const hasTags =
    tags.length > 0;

  if (hasCategory || hasTags) {

    taxonomyContainer.style.display = "flex";

  } else {

    taxonomyContainer.style.display = "none";
  }
}
    /* =========================================================
       ERROR
       ========================================================= */

    function showPostError(message) {

      document.getElementById(
        "post-title"
      ).textContent =
        "Post Not Found";

      document.getElementById(
        "post-body"
      ).innerHTML = `
        <div class="post-error">
          <h1>Something went wrong</h1>
          <p>${escapeHtml(message)}</p>
          <a
            href="/blog.html"
            class="post-action-btn"
          >
            ← Return to Blog
          </a>
        </div>
      `;
    }

    /* =========================================================
       LIKE
       ========================================================= */

    async function likePost() {

      const button =
        document.getElementById(
          "like-btn"
        );

      const sessionId =
        getSessionId();

      button.disabled = true;

      try {

        const response =
          await fetch(
            `${API_BASE_URL}/api/blog/posts/${encodeURIComponent(POST_ID)}/like`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json"
              },
              body: JSON.stringify({
                session_id:
                  sessionId
              })
            }
          );

        const data =
          await response.json();

        if (data.success) {

          document.getElementById(
            "post-like-count"
          ).textContent =
            data.like_count || 0;

          button.classList.add(
            "liked"
          );

        } else if (
          data.alreadyLiked
        ) {

          button.classList.add(
            "liked"
          );

          showToast(
            "You've already liked this post."
          );
        }

      } catch (error) {

        console.error(
          "Like error:",
          error
        );

        showToast(
          "Could not like the post."
        );

      } finally {

        button.disabled = false;
      }
    }

    /* =========================================================
       COMMENTS
       ========================================================= */

    async function loadComments() {

      const list =
        document.getElementById(
          "comments-list"
        );

      try {

        const response =
          await fetch(
            `${API_BASE_URL}/api/blog/posts/${encodeURIComponent(POST_ID)}/comments`
          );

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`
          );
        }

        const comments =
          await response.json();

        if (
          !Array.isArray(comments) ||
          comments.length === 0
        ) {

          list.innerHTML = `
            <div class="no-comments">
              Be the first to leave a comment. 💬
            </div>
          `;

          return;
        }

        list.innerHTML =
          comments
            .map(
              comment => `
                <div class="comment-item">

                  <div class="comment-meta">

                    <span class="comment-author">
                      ${escapeHtml(
                        comment.author_name ||
                        "Anonymous"
                      )}
                    </span>

                    <span class="comment-time">
                      ${timeAgo(
                        comment.created_at
                      )}
                    </span>

                  </div>

                  <div class="comment-body">
                    ${escapeHtml(
                      comment.comment_text ||
                      ""
                    )}
                  </div>

                </div>
              `
            )
            .join("");

      } catch (error) {

        console.error(
          "Comment loading error:",
          error
        );

        list.innerHTML = `
          <div class="no-comments">
            Comments could not be loaded right now.
          </div>
        `;
      }
    }

    /* =========================================================
       SUBMIT COMMENT
       ========================================================= */

    async function submitComment(event) {

      event.preventDefault();

      const authorInput =
        document.getElementById(
          "comment-author-input"
        );

      const textInput =
        document.getElementById(
          "comment-textarea"
        );

      const submitButton =
        document.getElementById(
          "comment-submit-btn"
        );

      const name =
        authorInput.value.trim();

      const commentText =
        textInput.value.trim();

      if (!name) {

        showToast(
          "Please enter your name."
        );

        authorInput.focus();

        return;
      }

      if (!commentText) {

        showToast(
          "Please write a comment."
        );

        textInput.focus();

        return;
      }

      localStorage.setItem(
        "visitor_name",
        name
      );

      submitButton.disabled = true;

      submitButton.textContent =
        "Posting...";

      try {

        const response =
          await fetch(
            `${API_BASE_URL}/api/blog/posts/${encodeURIComponent(POST_ID)}/comments`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json"
              },
              body: JSON.stringify({
                author_name:
                  name,
                comment_text:
                  commentText
              })
            }
          );

        const result =
          await response.json();

        if (
          response.ok &&
          result.success
        ) {

          textInput.value = "";

          if (
            result.comment_count !==
            undefined
          ) {

            document.getElementById(
              "post-comment-count"
            ).textContent =
              result.comment_count;
          }

          await loadComments();

          showToast(
            "Comment posted successfully!"
          );

        } else {

          showToast(
            result.message ||
            "Could not post your comment."
          );
        }

      } catch (error) {

        console.error(
          "Comment submission error:",
          error
        );

        showToast(
          "Could not connect to the server."
        );

      } finally {

        submitButton.disabled = false;

        submitButton.textContent =
          "Post Comment";
      }
    }

    /* =========================================================
       SHARE
       ========================================================= */

   function getPostUrl(postId) {
  return `${window.location.origin}/post.html?id=${encodeURIComponent(postId)}`;
}
    async function sharePost() {

      const title =
        document.getElementById(
          "post-title"
        ).textContent ||
        "Craig Mzumara Post";

      const url =
        getPostUrl();

      if (
        navigator.share
      ) {

        try {

          await navigator.share({
            title,
            text: title,
            url
          });

          return;

        } catch (error) {

          if (
            error.name ===
            "AbortError"
          ) {
            return;
          }
        }
      }

      openShareModal(
        title,
        url
      );
    }

    function openShareModal(
      title,
      url
    ) {

      document.getElementById(
        "share-whatsapp"
      ).href =
        `https://api.whatsapp.com/send?text=${encodeURIComponent(
          `${title} ${url}`
        )}`;

      document.getElementById(
        "share-twitter"
      ).href =
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          title
        )}&url=${encodeURIComponent(
          url
        )}`;

      document.getElementById(
        "share-facebook"
      ).href =
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          url
        )}`;

      document.getElementById(
        "share-modal"
      ).classList.add("active");
    }

    function closeShareModal() {

      document.getElementById(
        "share-modal"
      ).classList.remove(
        "active"
      );
    }

    async function copyPostLink() {

      const url =
        getPostUrl();

      try {

        await navigator.clipboard.writeText(
          url
        );

        showToast(
          "Link copied to clipboard!"
        );

      } catch {

        showToast(
          "Could not copy the link."
        );
      }
    }

    /* =========================================================
       INITIALIZE
       ========================================================= */

    document.addEventListener(
      "DOMContentLoaded",
      async () => {

        const storedName =
          localStorage.getItem(
            "visitor_name"
          );

        if (storedName) {

          document.getElementById(
            "comment-author-input"
          ).value =
            storedName;
        }

        document.getElementById(
          "like-btn"
        ).addEventListener(
          "click",
          likePost
        );

        document.getElementById(
          "share-btn"
        ).addEventListener(
          "click",
          sharePost
        );

        document.getElementById(
          "comments-btn"
        ).addEventListener(
          "click",
          () => {

            const section =
              document.getElementById(
                "comments-section"
              );

            section.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });

          }
        );

        document.getElementById(
          "comment-form"
        ).addEventListener(
          "submit",
          submitComment
        );

        document.getElementById(
          "share-close"
        ).addEventListener(
          "click",
          closeShareModal
        );

        document.getElementById(
          "share-copy"
        ).addEventListener(
          "click",
          copyPostLink
        );

        document.getElementById(
          "share-modal"
        ).addEventListener(
          "click",
          event => {

            if (
              event.target.id ===
              "share-modal"
            ) {

              closeShareModal();
            }
          }
        );

        document.addEventListener(
          "keydown",
          event => {

            if (
              event.key ===
              "Escape"
            ) {

              closeShareModal();
            }
          }
        );

        await loadPost();

        await loadComments();
      }
    );
    