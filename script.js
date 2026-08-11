// Point frontend fetch calls to your Railway backend
window.API_BASE_URL = window.API_BASE_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://craigmzumara-production.up.railway.app'
);

var initialTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', initialTheme);

const SITE_STORAGE_KEY = 'craigMzumaraSiteData';

function getSiteData() {
  try {
    return JSON.parse(localStorage.getItem(SITE_STORAGE_KEY)) || { blocks: {}, blogPosts: [] };
  } catch (err) {
    return { blocks: {}, blogPosts: [] };
  }
}

function setSiteData(data) {
  localStorage.setItem(SITE_STORAGE_KEY, JSON.stringify(data));
}

function applySiteData() {
  const data = getSiteData();
  if (!data.blocks) return;

  const projectBlock = data.blocks['domasi-preview-img'];
  if (projectBlock) {
    const imgEl = document.getElementById('domasi-preview-img');
    if (imgEl && projectBlock.image) imgEl.src = projectBlock.image;

    const titleEl = document.querySelector('.web-project-card .project-title');
    const descEl = document.querySelector('.web-project-card .project-desc');
    const tagsContainer = document.querySelector('.web-project-card .project-tags');

    if (titleEl && projectBlock.title) titleEl.textContent = projectBlock.title;
    if (descEl && projectBlock.subtitle) descEl.textContent = projectBlock.subtitle;
    if (tagsContainer && projectBlock.tech_tags) {
      tagsContainer.innerHTML = projectBlock.tech_tags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
        .map(tag => `<span class="tag">${tag}</span>`)
        .join('');
    }
  }

  ['photo-1', 'photo-2', 'photo-3'].forEach((photoId) => {
    const photoBlock = data.blocks[photoId];
    if (!photoBlock) return;

    const imgEl = document.querySelector(`img[data-element-id="${photoId}"]`);
    const cardEl = imgEl?.closest('.gallery-card');

    if (imgEl && photoBlock.image) imgEl.src = photoBlock.image;
    if (cardEl) {
      const titleEl = cardEl.querySelector('.card-title');
      const metaEl = cardEl.querySelector('.card-meta span:first-child');
      const badgeEl = cardEl.querySelector('.badge-device');
      if (titleEl && photoBlock.title) titleEl.textContent = photoBlock.title;
      if (metaEl && photoBlock.subtitle) metaEl.textContent = photoBlock.subtitle;
      if (badgeEl && photoBlock.badge) badgeEl.textContent = photoBlock.badge;
    }
  });
}

function setThemeToggle(buttonId) {
  const button = document.getElementById(buttonId);
  const htmlElement = document.documentElement;
  if (!button) return;
  button.addEventListener('click', () => {
    const currentTheme = htmlElement.getAttribute('data-theme');
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    htmlElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setThemeToggle('theme-toggle');
  setThemeToggle('admin-theme-toggle');

  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  const closeMobileMenu = () => {
    if (mobileMenuBtn && mobileDrawer) {
      mobileMenuBtn.classList.remove('active');
      mobileDrawer.classList.remove('open');
    }
  };

  if (mobileMenuBtn && mobileDrawer) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenuBtn.classList.toggle('active');
      mobileDrawer.classList.toggle('open');
    });
    mobileLinks.forEach(link => link.addEventListener('click', closeMobileMenu));
  }

  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  if (revealElements.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealElements.forEach(el => observer.observe(el));
  }

  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section');
  if (sections.length) {
    window.addEventListener('scroll', () => {
      let currentSection = '';
      sections.forEach(section => {
        const sectionTop = section.offsetTop - 120;
        if (window.scrollY >= sectionTop) {
          currentSection = section.getAttribute('id');
        }
      });
      navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${currentSection}`));
    });
  }

 const contactForm = document.getElementById('contact-form');
  const toast = document.getElementById('toast');
  if (contactForm) {
    contactForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (!toast) return;

      const formData = new FormData(contactForm);
      
      // Ensure Web3Forms required fields are set
      formData.set('access_key', 'cf7a4c43-431f-4461-9efe-627b2d41f612');
      formData.set('email', formData.get('contact'));

      const payload = {
        name: formData.get('name'),
        contact: formData.get('contact'),
        service: formData.get('service'),
        message: formData.get('message')
      };

      try {
        const [web3Res, dbRes] = await Promise.all([
          fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
          }),
          fetch(`${API_BASE_URL}/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        ]);

        if (web3Res.ok && dbRes.ok) {
          toast.textContent = 'Message sent successfully! I’ll be in touch soon.';
          toast.classList.add('show');
          contactForm.reset();
          setTimeout(() => toast.classList.remove('show'), 4000);
        } else {
          const web3Err = await web3Res.json().catch(() => ({}));
          console.error('Web3Forms Error Response:', web3Err);
          throw new Error('Web3Forms or DB submission failed');
        }
      } catch (err) {
        console.error('Submission Error:', err);
        toast.textContent = 'Unable to send message right now. Please try again or reach out directly.';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 6000);
      }
    });
  }

  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const galleryImages = document.querySelectorAll('.card-image-wrap img');

  const closeLightbox = () => {
    if (lightbox) lightbox.classList.remove('show');
  };
  galleryImages.forEach(img => {
    img.addEventListener('click', () => {
      if (lightbox && lightboxImg) {
        lightboxImg.src = img.src;
        lightbox.classList.add('show');
      }
    });
  });
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', event => {
      if (event.target !== lightboxImg && event.target !== lightboxClose) closeLightbox();
    });
  }

  const compareSlider = document.getElementById('compare-slider');
  const gradedImg = document.querySelector('.graded-img');
  const sliderLine = document.getElementById('slider-line');
  const sliderBtn = document.getElementById('slider-btn');
  if (compareSlider && gradedImg && sliderLine && sliderBtn) {
    compareSlider.addEventListener('input', event => {
      const sliderValue = event.target.value;
      gradedImg.style.clipPath = `polygon(0 0, ${sliderValue}% 0, ${sliderValue}% 100%, 0 100%)`;
      sliderLine.style.left = `${sliderValue}%`;
      sliderBtn.style.left = `${sliderValue}%`;
    });
  }

  applySiteData();
  loadPageImages();
});

function getFallbackImageUrl() {
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"%3E%3Crect width="800" height="600" fill="%23333"/%3E%3Ctext x="50%25" y="50%25" fill="%23fff" font-family="Arial, Helvetica, sans-serif" font-size="40" dominant-baseline="middle" text-anchor="middle"%3ENo+image+available%3C/text%3E%3C/svg%3E';
}

async function loadPageImages() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/images`);
    const data = await response.json();
    if (!Array.isArray(data)) return;

    data.forEach(item => {
      if (!item.element_id) return;
      const imageUrl = item.image_url
        ? (item.image_url.startsWith('http') ? item.image_url : `${window.location.origin}/${item.image_url}`)
        : getFallbackImageUrl();

      const imgEl = document.querySelector(`img[data-element-id="${item.element_id}"]`);
      if (imgEl) {
        imgEl.src = imageUrl;
      }

      const previewImg = document.getElementById(`prev-${item.element_id}`);
      if (previewImg) {
        previewImg.src = imageUrl;
      }

      if (item.element_id === 'domasi-preview-img') {
        const projectImg = document.getElementById('domasi-preview-img');
        if (projectImg) projectImg.src = imageUrl;

        const projectTitle = document.querySelector('.web-project-card .project-title');
        const projectDesc = document.querySelector('.web-project-card .project-desc');
        const projectTags = document.querySelector('.web-project-card .project-tags');

        if (projectTitle && item.title) projectTitle.textContent = item.title;
        if (projectDesc && item.subtitle) projectDesc.textContent = item.subtitle;
        if (projectTags && item.tech_tags) {
          projectTags.innerHTML = item.tech_tags
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean)
            .map(tag => `<span class="tag">${tag}</span>`)
            .join('');
        }
      }

      const cardEl = imgEl?.closest('.gallery-card') || previewImg?.closest('.gallery-card');
      if (cardEl) {
        const titleEl = cardEl.querySelector('.card-title');
        const subtitleEl = cardEl.querySelector('.card-meta span:first-child');
        const badgeEl = cardEl.querySelector('.badge-device');

        if (titleEl && item.title) titleEl.textContent = item.title;
        if (subtitleEl && item.subtitle) subtitleEl.textContent = item.subtitle;
        if (badgeEl && item.badge) badgeEl.textContent = item.badge;
      }
    });
  } catch (err) {
    console.error('Failed to load dynamic page images:', err);
  }
}

