

const SITE_HEADER_HTML = `
<header class="site-header" id="site-header">
  <div class="nav-wrap">
    <a href="index.html" class="brand"><span class="brand-icon">🌿</span> Flora of SXC</a>
    <nav>
      <ul class="nav-links" id="nav-links">
        <li><a href="index.html" data-nav="home">Home</a></li>
        <li><a href="trees.html" data-nav="trees">Tree Directory</a></li>
        <li><a href="index.html#qr-info" data-nav="qr">Scan &amp; Learn</a></li>
        <li><a href="admin.html" class="admin-link" data-nav="admin"><i class="fa-solid fa-lock"></i> Admin</a></li>
      </ul>
    </nav>
    <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>`;

const SITE_FOOTER_HTML = `
<footer class="site-footer">
  <div class="footer-grid">
    <div>
      <h4><span class="brand-icon">🌿</span> Flora of SXC</h4>
      <p>Flora of SXC is a campus tree directory developed in the context of the botanical legacy of St. Xavier's College and the Blatter Herbarium. Explore trees across the campus, discover their botanical identities, and learn about their ecological importance.</p>
    </div>
    <div>
      <h4>Explore</h4>
      <ul>
        <li><a href="index.html">Home</a></li>
        <li><a href="trees.html">Tree Directory</a></li>
        <li><a href="index.html#about">About the Project</a></li>
        <li><a href="index.html#qr-info">How QR Works</a></li>
      </ul>
    </div>
    <div>
      <h4>For Faculty</h4>
      <ul>
        <li><a href="admin.html">Admin Login</a></li>
        <li><a href="index.html#qr-info">Generate QR Codes</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <span>&copy; <span id="footer-year"></span> Flora of SXC · Department of Botany</span>
    <span>Built for campus biodiversity education 🌱</span>
  </div>
</footer>`;

document.addEventListener('DOMContentLoaded', () => {
  const headerMount = document.getElementById('header-mount');
  const footerMount = document.getElementById('footer-mount');
  if (headerMount) headerMount.innerHTML = SITE_HEADER_HTML;
  if (footerMount) footerMount.innerHTML = SITE_FOOTER_HTML;

  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const page = document.body.getAttribute('data-page');
  if (page) {
    document.querySelectorAll(`[data-nav="${page}"]`).forEach(el => el.classList.add('active'));
  }

  const header = document.getElementById('site-header');
  const onScroll = () => {
    if (!header) return;
    if (window.scrollY > 40) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll);
  onScroll();

  // Mobile nav toggle
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      toggle.classList.remove('open');
      links.classList.remove('open');
    }));
  }

  // Scroll reveal
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }


  const overlay = document.getElementById('page-transition');
  if (overlay) {
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (
  !href ||
  href.startsWith('#') ||
  href.startsWith('http') ||
  href.startsWith('mailto:') ||
  href.startsWith('tel:') ||
  a.target === '_blank'
) return;

const targetUrl = new URL(href, window.location.href);


if (
  targetUrl.pathname === window.location.pathname &&
  targetUrl.search === window.location.search &&
  targetUrl.hash
) return;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        overlay.classList.add('enter');
        overlay.style.display = 'flex';
        setTimeout(() => { window.location.href = href; }, 480);
      });
    });
  }

  // Site loader fade-out
  const loader = document.getElementById('site-loader');
  if (loader) {
    const hideLoader = () => loader.classList.add('hidden');
    if (document.readyState === 'complete') {
      setTimeout(hideLoader, 200);
    } else {
      window.addEventListener('load', () => setTimeout(hideLoader, 200));
    }
    // hard fallback so the loader never blocks the page
    setTimeout(hideLoader, 1100);
  }

  // Generate falling leaves for hero (if present)
  const leafField = document.getElementById('hero-leaves');
  if (leafField) {
    const leafIcons = ['🍃', '🌿', '🍀'];
    const count = window.innerWidth < 700 ? 10 : 18;
    for (let i = 0; i < count; i++) {
      const leaf = document.createElement('span');
      leaf.className = 'falling-leaf';
      leaf.textContent = leafIcons[i % leafIcons.length];
      leaf.style.left = Math.random() * 100 + '%';
      leaf.style.fontSize = (1 + Math.random() * 1.2) + 'rem';
      leaf.style.animationDuration = (9 + Math.random() * 10) + 's';
      leaf.style.animationDelay = (Math.random() * 10) + 's';
      leafField.appendChild(leaf);
    }
  }
});
