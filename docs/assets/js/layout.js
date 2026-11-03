(function () {
  const links = window.SUBLENS.links;
  const sprite = "assets/icons/sprite.svg";
  const icon = (id, cls = "icon") => `<svg class="${cls}" aria-hidden="true"><use href="${sprite}#${id}" /></svg>`;

  const nav = `
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-nav" data-nav>
      <div class="container site-nav-inner">
        <a class="brand" href="index.html" aria-label="Sublens home">
          <img src="assets/icons/sublens-logo.png" alt="" width="34" height="34" />
          <span class="brand-text">
            <span class="brand-name">Sub<span>lens</span></span>
            <span class="brand-sub">Chrome Extension</span>
          </span>
        </a>
        <nav class="nav-links" id="site-menu" aria-label="Main">
          <a href="index.html#features">Features</a>
          <a href="index.html#how-it-works">How it works</a>
          <a href="index.html#faq">FAQ</a>
        </nav>
        <div class="nav-actions">
          <button type="button" class="btn btn-soft" data-support-open aria-haspopup="dialog" aria-label="Support Sublens">
            ${icon("i-heart")}<span class="hide-sm">Support</span>
          </button>
          <a class="btn btn-primary" data-link="store" target="_blank" rel="noopener noreferrer" aria-label="Add Sublens to Chrome">
            ${icon("i-chrome")}<span class="hide-sm">Add to Chrome</span>
          </a>
          <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="site-menu" aria-label="Open menu">
            ${icon("i-menu", "icon icon-menu")}${icon("i-close", "icon icon-close")}
          </button>
        </div>
      </div>
    </header>
  `;

  const footer = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand-block">
            <a class="brand" href="index.html">
              <img src="assets/icons/sublens-logo.png" alt="" width="34" height="34" />
              <span class="brand-name">Sub<span>lens</span></span>
            </a>
            <p>Learn languages from the shows you already watch. Built by Matteo.</p>
            <button type="button" class="btn btn-soft" data-support-open aria-haspopup="dialog">
              ${icon("i-heart")}Support this project
            </button>
          </div>
          <ul class="footer-links">
            <li><a href="welcome.html">${icon("i-book")}Getting started</a></li>
            <li><a href="privacy.html">${icon("i-shield")}Privacy</a></li>
            <li><a data-link="changelog" target="_blank" rel="noopener noreferrer">${icon("i-list")}Changelog</a></li>
            <li><a data-link="github" target="_blank" rel="noopener noreferrer">${icon("i-github")}GitHub</a></li>
            <li><a data-link="linkedin" target="_blank" rel="noopener noreferrer">${icon("i-linkedin")}LinkedIn</a></li>
          </ul>
        </div>
        <p class="footer-mark" aria-hidden="true">Sublens</p>
        <p class="footer-note">
          <span>&copy; ${new Date().getFullYear()} Sublens. Free, open source, no tracking.</span>
        </p>
      </div>
    </footer>
  `;

  document.querySelectorAll("[data-site-nav]").forEach(el => {
    el.outerHTML = nav;
  });

  document.querySelectorAll("[data-site-footer]").forEach(el => {
    el.outerHTML = footer;
  });

  document.querySelectorAll("[data-link]").forEach(el => {
    const url = links[el.dataset.link];
    if (url) el.setAttribute("href", url);
  });

  const header = document.querySelector("[data-nav]");
  if (!header) return;

  const toggle = header.querySelector(".nav-toggle");

  function setOpen(open) {
    header.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  toggle.addEventListener("click", () => setOpen(!header.classList.contains("is-open")));

  header.querySelectorAll(".nav-links a").forEach(a => {
    a.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && header.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener("pointerdown", e => {
    if (header.classList.contains("is-open") && !header.contains(e.target)) setOpen(false);
  });

  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
})();
