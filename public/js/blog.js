 /*
 * ========================================================
 * API CONFIGURATION
 * ========================================================
 *
 * Frontend:
 *   Firebase Hosting
 *
 * Backend:
 *   Railway
 *
 * Database / Storage:
 *   Supabase
 * ========================================================
 */

window.API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://craigmzumara-production.up.railway.app";

    /*
     * ========================================================
     * STATE
     * ========================================================
     */

    let allPosts = [];

    let filteredPosts = [];

    let activeCategory = "all";

    let searchQuery = "";

    let pendingCommentPostId = null;


    /*
     * ========================================================
     * DOM
     * ========================================================
     */

    const feedContainer =
      document.getElementById("blog-feed");

    const featuredContainer =
      document.getElementById("featured-post");

    const categoryContainer =
      document.getElementById("category-list");

    const resultsInfo =
      document.getElementById("blog-results-info");

    const searchInput =
      document.getElementById("blog-search");



    /*
     * ========================================================
     * HELPERS
     * ========================================================
     */

    function getSessionId() {

      let sid =
        localStorage.getItem("blog_session_id");

      if (!sid) {

        sid =
          "sess_" +
          Math.random()
            .toString(36)
            .substring(2) +
          Date.now();

        localStorage.setItem(
          "blog_session_id",
          sid
        );

      }

      return sid;

    }


    function escapeHtml(value) {

      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    }


    function safeUrl(url) {

      if (!url) return "";

      try {

        const parsed =
          new URL(url, window.location.origin);

        if (
          parsed.protocol === "http:" ||
          parsed.protocol === "https:"
        ) {
          return parsed.href;
        }

      } catch (error) {

        console.warn(
          "Invalid image URL:",
          url
        );

      }

      return "";

    }


   function getPostUrl(postId) {
  // Firebase serves post.html directly. Do not use /post/:id
  // because that path is not guaranteed to rewrite to post.html.
  return `${window.location.origin}/post.html?id=${encodeURIComponent(postId)}`;
}


    function timeAgo(dateString) {

      const date =
        new Date(dateString);

      if (Number.isNaN(date.getTime())) {
        return "";
      }

      const now =
        new Date();

      const seconds =
        Math.floor(
          (now - date) / 1000
        );

      if (seconds < 60) {
        return "just now";
      }

      const minutes =
        Math.floor(seconds / 60);

      if (minutes < 60) {
        return `${minutes}m ago`;
      }

      const hours =
        Math.floor(minutes / 60);

      if (hours < 24) {
        return `${hours}h ago`;
      }

      const days =
        Math.floor(hours / 24);

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


    function calculateReadingTime(content) {

      const text =
        String(content || "")
          .trim();

      if (!text) {
        return "1 min read";
      }

      const words =
        text
          .split(/\s+/)
          .filter(Boolean)
          .length;

      const minutes =
        Math.max(
          1,
          Math.ceil(words / 200)
        );

      return `${minutes} min read`;

    }


    function getExcerpt(content, length = 180) {

      const text =
        String(content || "")
          .replace(/\s+/g, " ")
          .trim();

      if (text.length <= length) {
        return text;
      }

      return (
        text.substring(0, length).trim() +
        "..."
      );

    }


    /*
     * ========================================================
     * NORMALIZE POST DATA
     * ========================================================
     *
     * This lets the frontend tolerate slightly different
     * database field names while we restructure the backend.
     */
function normalizePost(post) {
  /*
   * =========================================================
   * CATEGORY NORMALIZATION
   * =========================================================
   */

  let category = "";

  if (
    typeof post.category_name === "string" &&
    post.category_name.trim()
  ) {
    category =
      post.category_name.trim();
  }

  /*
   * Some API responses may provide:
   *
   * category: {
   *   id: 1,
   *   name: "Education",
   *   slug: "education"
   * }
   */
  if (
    !category &&
    post.category &&
    typeof post.category === "object"
  ) {
    category = String(
      post.category.name ||
      post.category.title ||
      post.category.slug ||
      ""
    ).trim();
  }

  /*
   * Legacy/string compatibility.
   */
  if (
    !category &&
    typeof post.category === "string"
  ) {
    category = post.category.trim();
  }

  /*
   * =========================================================
   * TAG NORMALIZATION
   * =========================================================
   */

  let tags = [];

  if (Array.isArray(post.tags)) {
    tags = post.tags;

  } else if (
    typeof post.tags === "string"
  ) {
    try {
      const parsed =
        JSON.parse(post.tags);

      if (Array.isArray(parsed)) {
        tags = parsed;
      } else {
        tags = post.tags
          .split(",")
          .map(tag => tag.trim())
          .filter(Boolean);
      }

    } catch {
      tags = post.tags
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean);
    }
  }

  /*
   * Convert tag objects:
   *
   * {
   *   id: 1,
   *   name: "JavaScript",
   *   slug: "javascript"
   * }
   *
   * into:
   *
   * "JavaScript"
   */
  tags = tags
    .map(tag => {

      if (
        typeof tag === "string"
      ) {
        return tag.trim();
      }

      if (
        tag &&
        typeof tag === "object"
      ) {
        return String(
          tag.name ||
          tag.title ||
          tag.slug ||
          ""
        ).trim();
      }

      return "";

    })
    .filter(Boolean);

  /*
   * Remove duplicates.
   */
  tags = [
    ...new Set(tags)
  ];

  return {
    ...post,

    title:
      post.title ||
      "Untitled Post",

    content:
      post.content ||
      "",

    category:
      category ||
      "General",

    category_name:
      category,

    tags,

    image_url:
      post.image_url ||
      post.cover_image ||
      post.featured_image ||
      "",

    like_count:
      Number(
        post.like_count || 0
      ),

    comment_count:
      Number(
        post.comment_count || 0
      )
  };
}
    /*
     * ========================================================
     * FETCH POSTS
     * ========================================================
     */

    async function fetchBlogPosts() {

      renderLoading();

      try {

        const response =
          await fetch(
            `${API_BASE_URL}/api/blog/posts`
          );

        if (!response.ok) {

          throw new Error(
            `HTTP ${response.status}`
          );

        }

        const data =
          await response.json();

        if (!Array.isArray(data)) {

          throw new Error(
            "Invalid posts response."
          );

        }

        allPosts =
          data.map(normalizePost);

        applyFilters();

      } catch (error) {

        console.error(
          "Error fetching blog posts:",
          error
        );

        renderError();

      }

    }


    /*
     * ========================================================
     * LOADING / ERROR
     * ========================================================
     */

    function renderLoading() {

      featuredContainer.style.display =
        "none";

      feedContainer.innerHTML = `

        <div class="blog-loading">

          <div class="loading-spinner"></div>

          <span>
            Loading the latest posts...
          </span>

        </div>

      `;

      resultsInfo.textContent =
        "Loading posts...";

    }


    function renderError() {

      featuredContainer.style.display =
        "none";

      feedContainer.innerHTML = `

        <div class="blog-message">

          <strong>
            Couldn't load the blog.
          </strong>

          <span>
            Check your connection or local API server
            and try again.
          </span>

          <br />

          <button
            type="button"
            class="retry-btn"
            onclick="fetchBlogPosts()"
          >
            Try Again
          </button>

        </div>

      `;

      resultsInfo.textContent =
        "Unable to load posts.";

    }


    /*
     * ========================================================
     * CATEGORIES
     * ========================================================
     */

   function buildCategories(posts) {
  const categories = posts
    .map(post => {
      if (
        typeof post.category === "string"
      ) {
        return post.category.trim();
      }

      if (
        post.category &&
        typeof post.category === "object"
      ) {
        return String(
          post.category.name ||
          post.category.title ||
          post.category.slug ||
          ""
        ).trim();
      }

      if (
        typeof post.category_name === "string"
      ) {
        return post.category_name.trim();
      }

      return "";
    })
    .filter(Boolean);

  const unique = [
    ...new Set(categories)
  ].sort(
    (a, b) =>
      a.localeCompare(b)
  );

  categoryContainer.innerHTML = `
    <button
      type="button"
      class="category-btn ${
        activeCategory === "all"
          ? "active"
          : ""
      }"
      data-category="all"
    >
      All Posts
    </button>

    ${unique
      .map(category => `
        <button
          type="button"
          class="category-btn ${
            activeCategory === category
              ? "active"
              : ""
          }"
          data-category="${escapeHtml(category)}"
        >
          ${escapeHtml(category)}
        </button>
      `)
      .join("")}
  `;

  categoryContainer
    .querySelectorAll(".category-btn")
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          activeCategory =
            button.dataset.category;

          renderPosts();
        }
      );
    });
}

function attachTagFilters() {
  document
    .querySelectorAll(".tag-filter")
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.preventDefault();
          event.stopPropagation();

          const selectedTag =
            button.dataset.tag
              ?.trim()
              .toLowerCase();

          if (!selectedTag) {
            return;
          }

          filteredPosts =
            allPosts.filter(post =>
              Array.isArray(post.tags) &&
              post.tags.some(tag =>
                String(tag)
                  .trim()
                  .toLowerCase() ===
                selectedTag
              )
            );

          renderFilteredPosts();

          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });
        }
      );

    });
}
    /*
     * ========================================================
     * FILTER
     * ========================================================
     */

    function applyFilters() {

      buildCategories(allPosts);

      const query =
        searchQuery
          .trim()
          .toLowerCase();

      filteredPosts =
        allPosts.filter(post => {

          const categoryMatches =
            activeCategory === "all" ||
            String(post.category)
              .toLowerCase() ===
              activeCategory.toLowerCase();

          if (!categoryMatches) {
            return false;
          }

          if (!query) {
            return true;
          }

          const searchable =
            [
              post.title,
              post.content,
              post.category,
              ...(post.tags || [])
            ]
              .join(" ")
              .toLowerCase();

          return searchable.includes(query);

        });

      renderBlog();

    }


    /*
     * ========================================================
     * FEATURED POST
     * ========================================================
     */

    function renderFeatured(posts) {

      if (!posts.length) {

        featuredContainer.style.display =
          "none";

        return;

      }

      const featured =
        posts[0];

      const image =
        safeUrl(featured.image_url);

      featuredContainer.innerHTML = `

        <div class="featured-grid">

          <div class="featured-image">

            ${
              image

                ? `

                  <img
                    src="${escapeHtml(image)}"
                    alt="${escapeHtml(featured.title)}"
                    loading="eager"
                  />

                `

                : `

                  <div class="no-image">
                    CM
                  </div>

                `
            }

          </div>

          <div class="featured-content">

            <div class="featured-label">
              Latest Story
            </div>

            <div class="post-meta">

              <span class="post-meta-item post-category">
                ${escapeHtml(featured.category)}
              </span>

              <span>•</span>

              <span class="post-meta-item">
                ${timeAgo(featured.created_at)}
              </span>

              <span>•</span>

              <span class="post-meta-item">
                ${calculateReadingTime(featured.content)}
              </span>

            </div>

            <h2>

              <a
                href="${getPostUrl(featured.id)}"
              >
                ${escapeHtml(featured.title)}
              </a>

            </h2>

            <p class="featured-excerpt">
              ${escapeHtml(
                getExcerpt(featured.content, 260)
              )}
            </p>

            ${
              featured.tags.length

                ? `

                  <div class="post-tags">

${featured.tags
  .slice(0, 5)
  .map(tag => `
    <button
      type="button"
      class="post-tag tag-filter"
      data-tag="${escapeHtml(tag)}"
      title="View posts tagged ${escapeHtml(tag)}"
    >
      #${escapeHtml(tag)}
    </button>
  `)
  .join("")}
                  </div>

                `

                : ""
            }

            <div style="margin-top:22px;">

              <a
                href="${getPostUrl(featured.id)}"
                class="btn-primary"
              >
                Read Article
              </a>

            </div>

          </div>

        </div>

      `;

      featuredContainer.style.display =
        "block";

    }


    /*
     * ========================================================
     * BLOG CARDS
     * ========================================================
     */

    function renderBlog() {

      const posts =
        filteredPosts;

      resultsInfo.textContent =
        `${posts.length} ${
          posts.length === 1
            ? "post"
            : "posts"
        } found`;

      if (!posts.length) {

        featuredContainer.style.display =
          "none";

        feedContainer.innerHTML = `

          <div class="blog-message">

            <strong>
              No posts found.
            </strong>

            <span>
              Try another search term or category.
            </span>

            <br />

            <button
              type="button"
              class="retry-btn"
              onclick="resetBlogFilters()"
            >
              Reset Filters
            </button>

          </div>

        `;

        return;

      }

      /*
       * The first result becomes the featured story.
       */

      renderFeatured(posts);

      const remainingPosts =
        posts.slice(1);

      if (!remainingPosts.length) {

        feedContainer.innerHTML = "";

        return;

      }

      feedContainer.innerHTML =
        remainingPosts
          .map(renderPostCard)
          .join("");

    }


    function renderPostCard(post) {

    const imageUrl = post.image_url || "https://res.cloudinary.com/v1nymi7j/image/upload/v1786309580/hero-me.png";

return `
    <article
      class="blog-card"
      data-post-id="${escapeHtml(post.id)}"
    >
      <div class="blog-card-image">
        <img
          src="${escapeHtml(imageUrl)}"
          alt="${escapeHtml(post.title)}"
          loading="lazy"
          decoding="async"
        />
      </div>
    </article>
}
          </div>

          <div class="blog-card-content">

            <div class="post-meta">

              <span class="post-meta-item post-category">
                ${escapeHtml(post.category)}
              </span>

              <span>•</span>

              <span class="post-meta-item">
                ${timeAgo(post.created_at)}
              </span>

              <span>•</span>

              <span class="post-meta-item">
                ${calculateReadingTime(post.content)}
              </span>

            </div>

            <h2 class="blog-card-title">

              <a
                href="${getPostUrl(post.id)}"
              >
                ${escapeHtml(post.title)}
              </a>

            </h2>

            <p class="blog-card-excerpt">
              ${escapeHtml(
                getExcerpt(post.content)
              )}
            </p>

            ${
              post.tags.length

                ? `

                  <div class="post-tags">

${post.tags
  .slice(0, 5)
  .map(tag => `
    <button
      type="button"
      class="post-tag tag-filter"
      data-tag="${escapeHtml(tag)}"
      title="View posts tagged ${escapeHtml(tag)}"
    >
      #${escapeHtml(tag)}
    </button>
  `)
  .join("")}

                  </div>

                `

                : ""
            }

            <div class="blog-card-bottom">

              <div class="post-actions">

                <div class="action-group">

                  <button
                    type="button"
                    class="action-btn"
                    onclick="toggleComments(${JSON.stringify(post.id)})"
                  >

                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                      />
                    </svg>

                    <span
                      id="comment-count-${escapeHtml(post.id)}"
                    >
                      ${post.comment_count}
                    </span>

                  </button>

                  <button
                    type="button"
                    class="action-btn"
                    onclick="likePost(${JSON.stringify(post.id)}, this)"
                  >

                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                      />
                    </svg>

                    <span
                      id="like-count-${escapeHtml(post.id)}"
                    >
                      ${post.like_count}
                    </span>

                  </button>

                  <button
                    type="button"
                    class="action-btn"
                    onclick="sharePost(${JSON.stringify(post.id)})"
                  >

                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle
                        cx="18"
                        cy="5"
                        r="3"
                      />

                      <circle
                        cx="6"
                        cy="12"
                        r="3"
                      />

                      <circle
                        cx="18"
                        cy="19"
                        r="3"
                      />

                      <line
                        x1="8.59"
                        y1="13.51"
                        x2="15.42"
                        y2="17.49"
                      />

                      <line
                        x1="15.41"
                        y1="6.51"
                        x2="8.59"
                        y2="10.49"
                      />

                    </svg>

                    <span>
                      Share
                    </span>

                  </button>

                </div>

                <a
                  href="${getPostUrl(post.id)}"
                  class="action-btn read-btn"
                >
                  Read →
                </a>

              </div>

              <div
                class="comments-section"
                id="comments-section-${escapeHtml(post.id)}"
              >

                <div
                  class="comments-list"
                  id="comments-list-${escapeHtml(post.id)}"
                ></div>

                <div class="add-comment-box">

                  <input
                    type="text"
                    id="comment-input-${escapeHtml(post.id)}"
                    placeholder="Write a comment..."
                    maxlength="500"
                  />

                  <button
                    type="button"
                    class="btn-send-comment"
                    onclick="submitComment(${JSON.stringify(post.id)})"
                  >
                    Post
                  </button>

                </div>

              </div>

            </div>

          </div>

        </article>

      `;

    }


    /*
     * ========================================================
     * RESET FILTERS
     * ========================================================
     */

    function resetBlogFilters() {

      activeCategory = "all";

      searchQuery = "";

      searchInput.value = "";

      applyFilters();

    }


    /*
     * ========================================================
     * SEARCH
     * ========================================================
     */

    searchInput.addEventListener(
      "input",
      () => {

        searchQuery =
          searchInput.value;

        applyFilters();

      }
    );

    /*
     * ========================================================
     * LIKES
     * ========================================================
     */

    async function likePost(postId, button) {

      const sessionId =
        getSessionId();

      try {

        const response =
          await fetch(
            `${API_BASE_URL}/api/blog/posts/${postId}/like`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                session_id: sessionId
              })

            }
          );

        const data =
          await response.json();

        if (data.success) {

          const count =
            document.getElementById(
              `like-count-${postId}`
            );

          if (count) {
            count.textContent =
              data.like_count || 0;
          }

          button.classList.add(
            "liked"
          );

        } else if (data.alreadyLiked) {

          button.classList.add(
            "liked"
          );

        }

      } catch (error) {

        console.error(
          "Like error:",
          error
        );

      }

    }


    /*
     * ========================================================
     * COMMENTS
     * ========================================================
     */

    async function toggleComments(postId) {

      const section =
        document.getElementById(
          `comments-section-${postId}`
        );

      if (!section) {
        return;
      }

      section.classList.toggle(
        "open"
      );

      if (
        section.classList.contains(
          "open"
        )
      ) {

        await loadComments(
          postId
        );

      }

    }


    async function loadComments(postId) {

      const container =
        document.getElementById(
          `comments-list-${postId}`
        );

      if (!container) {
        return;
      }

      try {

        const response =
          await fetch(
            `${API_BASE_URL}/api/blog/posts/${postId}/comments`
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
          !comments.length
        ) {

          container.innerHTML = `

            <div
              style="
                color:var(--text-muted);
                font-size:.78rem;
                padding:5px 2px;
              "
            >
              No comments yet. Be the first.
            </div>

          `;

          return;

        }

        container.innerHTML =
          comments
            .map(comment => `

              <div class="comment-item">

                <div class="comment-header">

                  <span class="comment-author-name">
                    ${escapeHtml(
                      comment.author_name
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
                    comment.comment_text
                  )}
                </div>

              </div>

            `)
            .join("");

      } catch (error) {

        console.error(
          "Comment loading error:",
          error
        );

        container.innerHTML = `

          <div
            style="
              color:var(--text-muted);
              font-size:.78rem;
            "
          >
            Unable to load comments.
          </div>

        `;

      }

    }


    async function submitComment(postId) {

      const input =
        document.getElementById(
          `comment-input-${postId}`
        );

      if (!input) {
        return;
      }

      const text =
        input.value.trim();

      if (!text) {
        return;
      }

      let name =
        localStorage.getItem(
          "visitor_name"
        );

      if (!name) {

        pendingCommentPostId =
          postId;

        document
          .getElementById(
            "modal-name-input"
          )
          .value = "";

        document
          .getElementById(
            "name-modal"
          )
          .classList.add(
            "active"
          );

        return;

      }

      await sendCommentToApi(
        postId,
        name,
        text
      );

      input.value = "";

    }


    async function sendCommentToApi(
      postId,
      name,
      text
    ) {

      try {

        const response =
          await fetch(
            `${API_BASE_URL}/api/blog/posts/${postId}/comments`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                author_name: name,
                comment_text: text
              })

            }
          );

        const data =
          await response.json();

        if (data.success) {

          await loadComments(
            postId
          );

          const count =
            document.getElementById(
              `comment-count-${postId}`
            );

          if (count) {

            count.textContent =
              data.comment_count || 0;

          }

        }

      } catch (error) {

        console.error(
          "Comment submission error:",
          error
        );

      }

    }


    /*
     * ========================================================
     * NAME MODAL
     * ========================================================
     */

    document
      .getElementById(
        "modal-save-btn"
      )
      .addEventListener(
        "click",
        async () => {

          const input =
            document.getElementById(
              "modal-name-input"
            );

          const name =
            input.value.trim();

          if (!name) {
            input.focus();
            return;
          }

          localStorage.setItem(
            "visitor_name",
            name
          );

          document
            .getElementById(
              "name-modal"
            )
            .classList.remove(
              "active"
            );

          if (
            pendingCommentPostId
          ) {

            const postId =
              pendingCommentPostId;

            pendingCommentPostId =
              null;

            await submitComment(
              postId
            );

          }

        }
      );


    document
      .getElementById(
        "modal-cancel-btn"
      )
      .addEventListener(
        "click",
        () => {

          pendingCommentPostId =
            null;

          document
            .getElementById(
              "name-modal"
            )
            .classList.remove(
              "active"
            );

        }
      );


    /*
     * ========================================================
     * SHARE
     * ========================================================
     */

    function sharePost(postId) {

      const url =
        getPostUrl(postId);

      const post =
        allPosts.find(
          item =>
            String(item.id) ===
            String(postId)
        );

      const title =
        post?.title ||
        "Craig Mzumara Post";

      if (
        navigator.share
      ) {

        navigator
          .share({
            title,
            text: title,
            url
          })
          .catch(
            error => {
              console.warn(
                "Share canceled:",
                error
              );
            }
          );

        return;

      }

      openShareModal(
        url,
        title
      );

    }


    function openShareModal(
      url,
      title
    ) {

      document
        .getElementById(
          "share-whatsapp"
        )
        .href =
        `https://api.whatsapp.com/send?text=${encodeURIComponent(
          `${title}\n${url}`
        )}`;

      document
        .getElementById(
          "share-twitter"
        )
        .href =
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          title
        )}&url=${encodeURIComponent(
          url
        )}`;

      document
        .getElementById(
          "share-facebook"
        )
        .href =
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          url
        )}`;

      document
        .getElementById(
          "share-copy-btn"
        )
        .onclick =
        async () => {

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

        };

      document
        .getElementById(
          "share-modal"
        )
        .classList.add(
          "active"
        );

    }


    function closeShareModal() {

      document
        .getElementById(
          "share-modal"
        )
        .classList.remove(
          "active"
        );

    }


    document
      .getElementById(
        "share-close-btn"
      )
      .addEventListener(
        "click",
        closeShareModal
      );


    document
      .getElementById(
        "share-modal"
      )
      .addEventListener(
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


    /*
     * ========================================================
     * TOAST
     * ========================================================
     */

    function showToast(
      message
    ) {

      const toast =
        document.getElementById(
          "toast"
        );

      if (!toast) {
        return;
      }

      const span =
        toast.querySelector(
          "span"
        );

      if (span) {
        span.textContent =
          message;
      }

      toast.classList.add(
        "show"
      );

      setTimeout(
        () => {
          toast.classList.remove(
            "show"
          );
        },
        2500
      );

    }


    /*
     * ========================================================
     * ESCAPE MODALS
     * ========================================================
     */

    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key !== "Escape"
        ) {
          return;
        }

        document
          .querySelectorAll(
            ".modal-overlay.active"
          )
          .forEach(modal => {

            modal.classList.remove(
              "active"
            );

          });

      }
    );


    /*
     * ========================================================
     * START
     * ========================================================
     */

    document.addEventListener(
      "DOMContentLoaded",
      () => {

        fetchBlogPosts();

      }
    );
