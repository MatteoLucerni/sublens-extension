(function () {
  const links = window.SUBLENS.links;

  const nav = `
    <nav class="site-nav" aria-label="Main">
      <div class="container site-nav-inner">
        <a class="brand" href="/" aria-label="Sublens home">
          <img src="/assets/icons/sublens-logo.png" alt="" width="36" height="36" />
          <span class="brand-text">
            <span class="brand-name">Sub<span>lens</span></span>
            <span class="brand-sub">Chrome Extension</span>
          </span>
        </a>
        <ul class="nav-links">
          <li><a href="/#features">Features</a></li>
          <li><a href="/#how-it-works">How it works</a></li>
          <li><a href="/#faq">FAQ</a></li>
        </ul>
        <div class="nav-actions">
          <button type="button" class="btn btn-soft" data-support-open aria-haspopup="dialog" aria-label="Support Sublens">
            <i class="fas fa-heart"></i><span class="hide-sm">Support</span>
          </button>
          <a class="btn btn-primary" data-link="store" target="_blank" rel="noopener noreferrer" aria-label="Add Sublens to Chrome">
            <i class="fab fa-chrome"></i><span class="hide-sm">Add to Chrome</span>
          </a>
        </div>
      </div>
    </nav>
  `;

  const footer = `
    <footer class="site-footer">
      <div class="container">
        <a class="brand footer-brand" href="/">
          <img src="/assets/icons/sublens-logo.png" alt="" width="36" height="36" />
          <span class="brand-name">Sub<span>lens</span></span>
        </a>
        <p>Learn languages from the shows you already watch. Built by Matteo.</p>
        <ul class="footer-links">
          <li><a href="/welcome.html"><i class="fas fa-book-open"></i>Getting started</a></li>
          <li><a href="/privacy.html"><i class="fas fa-shield-halved"></i>Privacy</a></li>
          <li><a data-link="changelog" target="_blank" rel="noopener noreferrer"><i class="fas fa-list-check"></i>Changelog</a></li>
          <li><a data-link="github" target="_blank" rel="noopener noreferrer"><i class="fab fa-github"></i>GitHub</a></li>
          <li><a data-link="linkedin" target="_blank" rel="noopener noreferrer"><i class="fab fa-linkedin"></i>LinkedIn</a></li>
        </ul>
        <button type="button" class="btn btn-soft" data-support-open aria-haspopup="dialog">
          <i class="fas fa-heart"></i>Support this project
        </button>
        <p class="footer-note">&copy; ${new Date().getFullYear()} Sublens. Free, open source, no tracking.</p>
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
})();
