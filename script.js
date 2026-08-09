const initialTheme = localStorage.getItem('theme') || 'dark';
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
    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      if (toast) toast.classList.add('show');
      contactForm.reset();
      setTimeout(() => toast.classList.remove('show'), 4000);
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
});
