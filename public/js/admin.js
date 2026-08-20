
  const API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:3000"
      : "https://craigmzumara-production.up.railway.app";

  const IS_LOCAL_API =
    API_BASE_URL.includes("localhost") ||
    API_BASE_URL.includes("127.0.0.1");

  const ADMIN_TOKEN_KEY =
    "craigmzumara_admin_token";

  let adminLoginPromise = null;

  function getAdminToken() {
    try {
      return sessionStorage.getItem(ADMIN_TOKEN_KEY) || "";
    } catch {
      return "";
    }
  }

  function clearAdminToken() {
    try {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch {}
  }

  function setAdminToken(token) {
    try {
      sessionStorage.setItem(
        ADMIN_TOKEN_KEY,
        token
      );
    } catch {}
  }

  function ensureAdminLoginModal() {
    let modal =
      document.getElementById("admin-auth-modal");

    if (modal) {
      return modal;
    }

    modal = document.createElement("div");
    modal.id = "admin-auth-modal";
    modal.innerHTML = `
      <div class="admin-auth-backdrop">
        <form class="admin-auth-dialog" id="admin-auth-form">
          <div class="admin-auth-brand">CM</div>
          <h2>Admin sign in</h2>
          <p>Sign in to manage your portfolio and blog content.</p>

          <label for="admin-auth-username">Username</label>
          <input
            id="admin-auth-username"
            name="username"
            type="text"
            autocomplete="username"
            value="craigmzumara1"
            required
          />

          <label for="admin-auth-password">Password</label>
          <input
            id="admin-auth-password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
          />

          <p
            id="admin-auth-error"
            class="admin-auth-error"
            role="alert"
          ></p>

          <button
            type="submit"
            id="admin-auth-submit"
            class="btn-primary"
          >
            Sign in
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    return modal;
  }

  async function loginAdmin() {
    if (IS_LOCAL_API) {
      return true;
    }

    const existingToken = getAdminToken();

    if (existingToken) {
      return true;
    }

    if (adminLoginPromise) {
      return adminLoginPromise;
    }

    adminLoginPromise =
      new Promise(resolve => {
        const modal =
          ensureAdminLoginModal();

        modal.classList.add("active");

        const form =
          document.getElementById(
            "admin-auth-form"
          );

        const username =
          document.getElementById(
            "admin-auth-username"
          );

        const password =
          document.getElementById(
            "admin-auth-password"
          );

        const errorBox =
          document.getElementById(
            "admin-auth-error"
          );

        const submitButton =
          document.getElementById(
            "admin-auth-submit"
          );

        const submit = async event => {
          event.preventDefault();

          errorBox.textContent = "";
          submitButton.disabled = true;
          submitButton.textContent = "Signing in...";

          try {
            const response = await fetch(
              `${API_BASE_URL}/api/auth/login`,
              {
                method: "POST",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                  "Accept": "application/json"
                },
                body: JSON.stringify({
                  username: username.value.trim(),
                  password: password.value
                })
              }
            );

            const result =
              await response.json().catch(() => ({}));

            if (!response.ok || !result.success || !result.token) {
              throw new Error(
                result.error ||
                `Authentication failed (HTTP ${response.status}).`
              );
            }

            setAdminToken(result.token);
            password.value = "";
            modal.classList.remove("active");
            form.removeEventListener("submit", submit);
            resolve(true);
          } catch (error) {
            console.error("Admin login failed:", error);
            errorBox.textContent =
              error.message ||
              "Unable to sign in.";
            password.focus();
            submitButton.disabled = false;
            submitButton.textContent = "Sign in";
          }
        };

        form.addEventListener("submit", submit);
      }).finally(() => {
        adminLoginPromise = null;
      });

    return adminLoginPromise;
  }

  async function authenticatedRequest(url, options = {}, retry = true) {
    if (!IS_LOCAL_API && !getAdminToken()) {
      await loginAdmin();
    }

    const headers =
      new Headers(options.headers || {});

    const token =
      getAdminToken();

    if (token) {
      headers.set(
        "Authorization",
        `Bearer ${token}`
      );
    }

    let response;

    try {
      response = await fetch(url, {
        ...options,
        headers,
        credentials: "include"
      });
    } catch (error) {
      console.error(
        "Railway API network/CORS error:",
        error
      );

      throw new Error(
        "Could not communicate with the Railway server. Check the Railway API and CORS configuration."
      );
    }

    if (
      response.status === 401 &&
      !IS_LOCAL_API &&
      retry
    ) {
      clearAdminToken();
      await loginAdmin();

      return authenticatedRequest(
        url,
        options,
        false
      );
    }

    if (response.status === 401) {
      throw new Error(
        "Admin authentication is required. Please reload the page and sign in again."
      );
    }

    return response;
  }

  /*
   * ==========================================================
   * HTML ESCAPING
   * ==========================================================
   */

  function escapeHtml(value) {

    const div =
      document.createElement("div");

    div.textContent =
      value == null
        ? ""
        : String(value);

    return div.innerHTML;

  }

    /*
     * ==========================================================
     * FALLBACK IMAGE
     * ==========================================================
     */

    function getFallbackImageUrl() {

      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"%3E%3Crect width="800" height="600" fill="%23333"/%3E%3Ctext x="50%25" y="50%25" fill="%23fff" font-family="Arial, Helvetica, sans-serif" font-size="40" dominant-baseline="middle" text-anchor="middle"%3ENo+image+available%3C/text%3E%3C/svg%3E';

    }


    /*
     * ==========================================================
     * SHOW TOAST
     * ==========================================================
     */

    function showToast(message) {

      const toast =
        document.getElementById('toast');

      if (!toast) return;

      const span =
        toast.querySelector('span');

      if (span) {
        span.textContent = message;
      }

      toast.classList.add('show');

      setTimeout(
        () => {
          toast.classList.remove('show');
        },
        3000
      );

    }


    /*
     * ==========================================================
     * INITIALIZATION
     * ==========================================================
     */

    document.addEventListener(
      'DOMContentLoaded',
      () => {

        initializeTheme();

        initializeImagePreviews();

        if (!IS_LOCAL_API) {
          loginAdmin().catch(error => {
            console.error("Admin authentication failed:", error);
          });
        }

        initializeBlogCMS();

        initializeProjectAndPhotoForms();

        loadAdminImages();

        loadAdminPosts();

      }
    );


    /*
     * ==========================================================
     * THEME
     * ==========================================================
     */

    function initializeTheme() {

      const themeToggleBtn =
        document.getElementById(
          'admin-theme-toggle'
        );


      if (!themeToggleBtn) return;


      themeToggleBtn.addEventListener(
        'click',
        () => {

          const currentTheme =
            document.documentElement
              .getAttribute('data-theme');


          const newTheme =
            currentTheme === 'dark'
              ? 'light'
              : 'dark';


          document.documentElement
            .setAttribute(
              'data-theme',
              newTheme
            );


          localStorage.setItem(
            'theme',
            newTheme
          );

        }
      );

    }


    /*
     * ==========================================================
     * IMAGE PREVIEWS
     * ==========================================================
     */

    function initializeImagePreviews() {

      document
        .querySelectorAll('.file-input')
        .forEach(
          input => {

            input.addEventListener(
              'change',
              event => {

                const file =
                  event.target.files[0];

                const targetImgId =
                  event.target
                    .getAttribute(
                      'data-target-img'
                    );


                if (!file) return;


                /*
                 * Blog cover preview
                 */

                if (
                  event.target.id ===
                  'file-blog-image'
                ) {

                  const preview =
                    document.getElementById(
                      'blog-image-preview'
                    );

                  const container =
                    document.getElementById(
                      'blog-image-preview-container'
                    );


                  if (preview && container) {

                    const reader =
                      new FileReader();


                    reader.onload =
                      event => {

                        preview.src =
                          event.target.result;

                        container.style.display =
                          'block';

                      };


                    reader.readAsDataURL(file);

                  }

                  return;

                }


                /*
                 * Project / photography previews
                 */

                if (
                  targetImgId
                ) {

                  const target =
                    document.getElementById(
                      targetImgId
                    );


                  if (!target) return;


                  const reader =
                    new FileReader();


                  reader.onload =
                    event => {

                      target.src =
                        event.target.result;

                    };


                  reader.readAsDataURL(file);

                }

              }
            );

          }
        );

    }


    /*
     * ==========================================================
     * BLOG CMS
     * ==========================================================
     */

    async function initializeBlogCMS() {

      const form =
        document.getElementById(
          'blog-publish-form'
        );


      if (!form) return;


      const categorySelect =
        document.getElementById(
          'blog-category'
        );


      const tagsContainer =
        document.getElementById(
          'blog-tags-container'
        );


      const statusSelect =
        document.getElementById(
          'blog-status'
        );


      const submitText =
        document.getElementById(
          'blog-submit-text'
        );


      const resetButton =
        document.getElementById(
          'blog-reset-button'
        );


      /*
       * Load categories and tags.
       */

      await loadBlogCategories(
        categorySelect
      );

      await loadBlogTags(
        tagsContainer
      );


      /*
       * Update submit text.
       */

      if (statusSelect) {

        statusSelect.addEventListener(
          'change',
          () => {

            submitText.textContent =
              statusSelect.value === 'draft'
                ? 'Save Draft'
                : 'Publish Post';

          }
        );

      }


      /*
       * Reset button.
       */

      if (resetButton) {

        resetButton.addEventListener(
          'click',
          () => {

            form.reset();


            const previewContainer =
              document.getElementById(
                'blog-image-preview-container'
              );


            if (previewContainer) {

              previewContainer.style.display =
                'none';

            }


            if (submitText) {

              submitText.textContent =
                'Publish Post';

            }

          }
        );

      }


      /*
       * Submit blog post.
       */

      form.addEventListener(
        'submit',
        async event => {

          event.preventDefault();


          const title =
            document.getElementById(
              'blog-title'
            ).value.trim();


          const excerpt =
            document.getElementById(
              'blog-excerpt'
            ).value.trim();


          const content =
            document.getElementById(
              'blog-content'
            ).value.trim();


          const categoryId =
            categorySelect
              ? categorySelect.value
              : '';


          const status =
            statusSelect
              ? statusSelect.value
              : 'published';


          const featured =
            document.getElementById(
              'blog-featured'
            ).checked;


          const imageInput =
            document.getElementById(
              'file-blog-image'
            );


          /*
           * Validation
           */

          if (!title) {

            alert(
              'Please enter a title.'
            );

            return;

          }


          if (!content) {

            alert(
              'Please enter article content.'
            );

            return;

          }


          /*
           * Selected tags
           */

          const selectedTags =
            Array.from(
              document.querySelectorAll(
                'input[name="blog-tag"]:checked'
              )
            ).map(
              checkbox =>
                checkbox.value
            );


          /*
           * Build FormData
           */

          const formData =
            new FormData();


          formData.append(
            'title',
            title
          );


          formData.append(
            'excerpt',
            excerpt
          );


          formData.append(
            'content',
            content
          );


          formData.append(
            'category_id',
            categoryId
          );


          formData.append(
            'tags',
            JSON.stringify(
              selectedTags
            )
          );


          formData.append(
            'featured',
            String(featured)
          );


          formData.append(
            'status',
            status
          );


          if (
            imageInput &&
            imageInput.files &&
            imageInput.files[0]
          ) {

            formData.append(
              'image',
              imageInput.files[0]
            );

          }


          /*
           * Disable submit button.
           */

          const submitButton =
            document.getElementById(
              'blog-submit-button'
            );


          const originalText =
            submitText.textContent;


          if (submitButton) {

            submitButton.disabled =
              true;

          }


          submitText.textContent =
            status === 'draft'
              ? 'Saving...'
              : 'Publishing...';


          try {

            const response =
              await authenticatedRequest(
                `${API_BASE_URL}/api/blog/posts`,
                {
                  method: 'POST',
                  body: formData
                }
              );


            let result;


            try {
              result = await response.json();
            } catch {
              const raw = await response.text().catch(() => '');
              throw new Error(
                raw
                  ? `Server returned HTTP ${response.status}: ${raw}`
                  : `Server returned HTTP ${response.status}.`
              );
            }


            if (!response.ok) {

              throw new Error(
                result.error ||
                `Request failed with status ${response.status}.`
              );

            }


            if (!result.success) {

              throw new Error(
                result.error ||
                'The post could not be saved.'
              );

            }


            /*
             * Success.
             */

            showToast(
              status === 'draft'
                ? 'Draft saved successfully!'
                : 'Post published successfully!'
            );


            form.reset();


            const previewContainer =
              document.getElementById(
                'blog-image-preview-container'
              );


            if (previewContainer) {

              previewContainer.style.display =
                'none';

            }


            submitText.textContent =
              'Publish Post';


            /*
             * Refresh post list.
             */

            await loadAdminPosts();

          } catch (error) {

            console.error(
              'Blog publishing failed:',
              error
            );


            alert(
              error.message ||
              'Failed to save the blog post.'
            );


            submitText.textContent =
              originalText;

          } finally {

            if (submitButton) {

              submitButton.disabled =
                false;

            }

          }

        }
      );

    }


    /*
     * ==========================================================
     * LOAD CATEGORIES
     * ==========================================================
     */

    async function loadBlogCategories(
      select
    ) {

      if (!select) return;


      try {

        const response =
          await fetch(
            `${API_BASE_URL}/api/blog/categories`
          );


        if (!response.ok) {

          throw new Error(
            'Unable to load categories.'
          );

        }


        const categories =
          await response.json();


        select.innerHTML =
          '<option value="">Select category</option>';


        if (!Array.isArray(categories)) {
          return;
        }


        categories.forEach(
          category => {

            const option =
              document.createElement(
                'option'
              );


            option.value =
              category.id;


            option.textContent =
              category.name;


            select.appendChild(
              option
            );

          }
        );

      } catch (error) {

        console.error(
          'Failed to load categories:',
          error
        );


        select.innerHTML =
          '<option value="">Categories unavailable</option>';

      }

    }


    /*
     * ==========================================================
     * LOAD TAGS
     * ==========================================================
     */

    async function loadBlogTags(
      container
    ) {

      if (!container) return;


      try {

        const response =
          await fetch(
            `${API_BASE_URL}/api/blog/tags`
          );


        if (!response.ok) {

          throw new Error(
            'Unable to load tags.'
          );

        }


        const tags =
          await response.json();


        container.innerHTML = '';


        if (
          !Array.isArray(tags) ||
          tags.length === 0
        ) {

          container.innerHTML =
            '<span style="color:var(--text-muted); font-size:0.85rem;">No tags available.</span>';

          return;

        }


        tags.forEach(
          tag => {

            const label =
              document.createElement(
                'label'
              );


            label.className =
              'blog-tag-option';


            const checkbox =
              document.createElement(
                'input'
              );


            checkbox.type =
              'checkbox';


            checkbox.name =
              'blog-tag';


            checkbox.value =
              tag.id;


            const text =
              document.createElement(
                'span'
              );


            text.textContent =
              `#${tag.name}`;


            label.appendChild(
              checkbox
            );


            label.appendChild(
              text
            );


            container.appendChild(
              label
            );

          }
        );

      } catch (error) {

        console.error(
          'Failed to load tags:',
          error
        );


        container.innerHTML =
          '<span style="color:var(--text-muted); font-size:0.85rem;">Tags unavailable.</span>';

      }

    }


    /*
     * ==========================================================
     * LOAD ADMIN POSTS
     * ==========================================================
     */

    async function loadAdminPosts() {

      const listContainer =
        document.getElementById(
          'admin-posts-list'
        );


      if (!listContainer) return;


      try {

        const response =
          await fetch(
            `${API_BASE_URL}/api/blog/posts`
          );


        if (!response.ok) {

          throw new Error(
            'Failed to load blog posts.'
          );

        }


        const posts =
          await response.json();


        if (
          !Array.isArray(posts) ||
          posts.length === 0
        ) {

          listContainer.innerHTML =
            '<p style="color:var(--text-muted);">No blog posts found.</p>';

          return;

        }


        listContainer.innerHTML =
          posts
            .map(
              post => {

                const title =
                  escapeHtml(
                    post.title ||
                    'Untitled Post'
                  );


                const status =
                  escapeHtml(
                    post.status ||
                    'published'
                  );


                const category =
                  escapeHtml(
                    post.category_name ||
                    'Uncategorized'
                  );


                const date =
                  post.published_at ||
                  post.created_at;


                return `
                  <div
                    class="admin-post-item"
                    id="admin-post-${post.id}"
                  >

                    <div class="post-info">

                      <h4>
                        ${title}
                      </h4>

                      <span class="post-date">
                        ${date
                          ? new Date(date).toLocaleDateString()
                          : ''}
                      </span>

                      <br>

                      <span class="post-status">
                        ${status}
                      </span>

                      <span
                        class="post-status"
                        style="margin-left:5px;"
                      >
                        ${category}
                      </span>

                    </div>

                    <button
                      type="button"
                      onclick="deleteBlogPost(${post.id})"
                      class="btn-delete-post"
                    >
                      Delete
                    </button>

                  </div>
                `;

              }
            )
            .join('');

      } catch (error) {

        console.error(
          'Failed to load posts:',
          error
        );


        listContainer.innerHTML =
          '<p style="color:#ff5555;">Unable to load blog posts.</p>';

      }

    }


    /*
     * ==========================================================
     * DELETE BLOG POST
     * ==========================================================
     */

    async function deleteBlogPost(
      postId
    ) {

      if (
        !confirm(
          'Are you sure you want to delete this blog post?'
        )
      ) {

        return;

      }


      try {

        const response =
          await authenticatedRequest(
            `${API_BASE_URL}/api/admin/blog/posts/${postId}`,
            {
              method: 'DELETE'
            }
          );


        let result;


        try {

          result =
            await response.json();

        } catch {

          throw new Error(
            `Server returned HTTP ${response.status}.`
          );

        }


        if (!response.ok) {

          throw new Error(
            result.error ||
            `Delete failed with status ${response.status}.`
          );

        }


        if (!result.success) {

          throw new Error(
            result.error ||
            'Failed to delete post.'
          );

        }


        const element =
          document.getElementById(
            `admin-post-${postId}`
          );


        if (element) {

          element.remove();

        }


        showToast(
          'Post deleted successfully!'
        );

      } catch (error) {

        console.error(
          'Failed to delete blog post:',
          error
        );


        alert(
          error.message ||
          'Failed to delete blog post.'
        );

      }

    }


    /*
     * ==========================================================
     * LOAD PROJECT / PHOTOGRAPHY DATA
     * ==========================================================
     */

    async function loadAdminImages() {

      try {

        const response =
          await fetch(
            `${API_BASE_URL}/api/images`
          );


        if (!response.ok) {

          throw new Error(
            'Failed to load image data.'
          );

        }


        const data =
          await response.json();


        if (!Array.isArray(data)) {
          return;
        }


        data.forEach(
          item => {

            const previewImg =
              document.getElementById(
                `prev-${item.element_id}`
              );


            if (previewImg) {

              previewImg.src =
                item.image_url
                  ? (
                      item.image_url.startsWith('http')
                        ? item.image_url
                        : `${API_BASE_URL}/${item.image_url}`
                    )
                  : getFallbackImageUrl();

            }


            const form =
              document.querySelector(
                `.upload-form[data-element="${item.element_id}"]`
              );


            if (!form) {
              return;
            }


            const titleInput =
              form.querySelector(
                '.title-input'
              );


            const subtitleInput =
              form.querySelector(
                '.subtitle-input'
              );


            const badgeInput =
              form.querySelector(
                '.badge-input'
              );


            const techTagsInput =
              form.querySelector(
                '.tech-tags-input'
              );


            const demoUrlInput =
              form.querySelector(
                '.demo-url-input'
              );


            const githubUrlInput =
              form.querySelector(
                '.github-url-input'
              );


            if (
              titleInput &&
              item.title
            ) {

              titleInput.value =
                item.title;

            }


            if (
              subtitleInput &&
              item.subtitle
            ) {

              subtitleInput.value =
                item.subtitle;

            }


            if (
              badgeInput &&
              item.badge
            ) {

              badgeInput.value =
                item.badge;

            }


            if (
              techTagsInput &&
              item.tech_tags
            ) {

              techTagsInput.value =
                item.tech_tags;

            }


            if (
              demoUrlInput &&
              item.live_demo_url
            ) {

              demoUrlInput.value =
                item.live_demo_url;

            }


            if (
              githubUrlInput &&
              item.github_url
            ) {

              githubUrlInput.value =
                item.github_url;

            }

          }
        );

      } catch (error) {

        console.error(
          'Error populating admin fields:',
          error
        );

      }

    }


    /*
     * ==========================================================
     * PROJECT / PHOTOGRAPHY FORMS
     * ==========================================================
     */

    function initializeProjectAndPhotoForms() {

      const forms =
        document.querySelectorAll(
          '.upload-form'
        );


      forms.forEach(
        form => {

          form.addEventListener(
            'submit',
            async event => {

              event.preventDefault();


              const elementId =
                form.getAttribute(
                  'data-element'
                );


              const fileInput =
                form.querySelector(
                  '.file-input'
                );


              const titleInput =
                form.querySelector(
                  '.title-input'
                )?.value || '';


              const subtitleInput =
                form.querySelector(
                  '.subtitle-input'
                )?.value || '';


              const badgeInput =
                form.querySelector(
                  '.badge-input'
                )?.value || '';


              const techTagsInput =
                form.querySelector(
                  '.tech-tags-input'
                )?.value || '';


              const demoUrlInput =
                form.querySelector(
                  '.demo-url-input'
                )?.value || '';


              const githubUrlInput =
                form.querySelector(
                  '.github-url-input'
                )?.value || '';


              const formData =
                new FormData();


              formData.append(
                'element_id',
                elementId
              );


              formData.append(
                'title',
                titleInput
              );


              formData.append(
                'subtitle',
                subtitleInput
              );


              formData.append(
                'badge',
                badgeInput
              );


              formData.append(
                'tech_tags',
                techTagsInput
              );


              formData.append(
                'live_demo_url',
                demoUrlInput
              );


              formData.append(
                'github_url',
                githubUrlInput
              );


              if (
                fileInput &&
                fileInput.files &&
                fileInput.files[0]
              ) {

                formData.append(
                  'image',
                  fileInput.files[0]
                );

              }


              const submitButton =
                form.querySelector(
                  'button[type="submit"]'
                );


              const originalText =
                submitButton
                  ? submitButton.textContent
                  : 'Save Changes';


              if (submitButton) {

                submitButton.disabled =
                  true;

                submitButton.textContent =
                  'Saving...';

              }


              try {

                const response =
                  await authenticatedRequest(
                    `${API_BASE_URL}/api/admin/upload-image`,
                    {
                      method: 'POST',
                      body: formData
                    }
                  );


                let result;


                try {

                  result =
                    await response.json();

                } catch {

                  throw new Error(
                    `Server returned HTTP ${response.status}.`
                  );

                }


                if (!response.ok) {

                  throw new Error(
                    result.error ||
                    `Update failed with status ${response.status}.`
                  );

                }


                if (!result.success) {

                  throw new Error(
                    result.error ||
                    'Update failed.'
                  );

                }


                showToast(
                  'Changes saved successfully!'
                );


              } catch (error) {

                console.error(
                  'Error updating data:',
                  error
                );


                alert(
                  error.message ||
                  'Error updating data.'
                );


              } finally {

                if (submitButton) {

                  submitButton.disabled =
                    false;

                  submitButton.textContent =
                    originalText;

                }

              }

            }
          );

        }
      );

    }