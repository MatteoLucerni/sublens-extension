(function () {
  const links = window.SUBLENS.links;

  const svgChat = '<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>';
  const svgClose = '<svg viewBox="0 0 24 24"><path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 1 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"/></svg>';

  const stroke = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const svgStar = `<svg viewBox="0 0 24 24" ${stroke}><path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.8l6.5-.9z"/></svg>`;
  const svgBug = `<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`;
  const svgFeedback = `<svg viewBox="0 0 24 24" ${stroke}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  const svgExit = `<svg viewBox="0 0 24 24" ${stroke}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>`;

  const cards = [
    { icon: svgStar, cls: "fb-feature", title: "Request a Feature", sub: "Suggest an improvement or new idea", link: links.feedback },
    { icon: svgBug, cls: "fb-bug", title: "Report a Bug", sub: "Something isn't working correctly", link: links.feedback },
    { icon: svgFeedback, cls: "fb-feedback", title: "Give Feedback", sub: "Share your thoughts with us", link: links.feedback },
    { icon: svgExit, cls: "fb-uninstall", title: "Uninstall Feedback", sub: "Tell us why you're leaving", link: links.uninstallFeedback },
  ];

  const root = document.createElement("div");
  root.className = "fb-widget";
  root.innerHTML = `
    <div class="fb-widget-popup">
      <p class="fb-widget-title">How can we help?</p>
      <p class="fb-widget-subtitle">Choose an option below to share your feedback.</p>
      ${cards
        .map(
          c => `
      <a class="fb-widget-card" href="${c.link}" target="_blank" rel="noopener noreferrer">
        <span class="fb-widget-icon ${c.cls}">${c.icon}</span>
        <span class="fb-widget-card-text"><span>${c.title}</span><small>${c.sub}</small></span>
      </a>`
        )
        .join("")}
    </div>
    <button type="button" class="fb-widget-fab" aria-label="Feedback" aria-expanded="false">${svgChat}</button>
  `;
  document.body.appendChild(root);

  const popup = root.querySelector(".fb-widget-popup");
  const fab = root.querySelector(".fb-widget-fab");
  let isOpen = false;

  function setOpen(open) {
    isOpen = open;
    popup.classList.toggle("fb-visible", open);
    fab.classList.toggle("fb-open", open);
    fab.setAttribute("aria-expanded", String(open));
    fab.innerHTML = open ? svgClose : svgChat;
  }

  fab.addEventListener("click", e => {
    e.stopPropagation();
    setOpen(!isOpen);
  });

  document.addEventListener("click", e => {
    if (isOpen && !root.contains(e.target)) setOpen(false);
  });

  document.addEventListener("keydown", e => {
    if (isOpen && e.key === "Escape") setOpen(false);
  });
})();
