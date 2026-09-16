(function () {
  const links = window.SUBLENS.links;

  const stroke = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const arrow = `<span class="sl-support-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" ${stroke}><path d="M7 17 17 7M9 7h8v8"/></svg></span>`;
  const iconCoffee = `<svg viewBox="0 0 24 24" ${stroke}><path d="M2 8h15a3 3 0 0 1 0 6h-1"/><path d="M2 8v9a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8"/><path d="M6 2c-.5 1 -1.5 1.5 -1 3M10 2c-.5 1 -1.5 1.5 -1 3"/></svg>`;
  const iconGithub = `<svg viewBox="0 0 24 24" ${stroke}><path d="m8 18-6-6 6-6M16 6l6 6-6 6"/></svg>`;
  const iconStar = `<svg viewBox="0 0 24 24" ${stroke}><path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.8l6.5-.9z"/></svg>`;

  const options = [
    {
      cls: "sl-support-coffee",
      icon: iconCoffee,
      link: links.kofi,
      name: "Buy me a coffee",
      desc: "A one-off contribution on Ko-fi. No account and no subscription needed.",
    },
    {
      cls: "sl-support-github",
      icon: iconGithub,
      link: links.github,
      name: "Contribute on GitHub",
      desc: "Send a pull request, or report a broken subtitle with the title and platform it happened on.",
    },
    {
      cls: "sl-support-review",
      icon: iconStar,
      link: links.reviews,
      name: "Leave a review",
      desc: "A rating on the Chrome Web Store costs nothing and helps other learners find the extension.",
    },
  ];

  const modal = document.createElement("div");
  modal.className = "sl-support-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="sl-support-scrim" data-support-close></div>
    <div class="sl-support-card" role="dialog" aria-modal="true" aria-labelledby="sl-support-title">
      <div class="sl-support-head">
        <h2 class="sl-support-title" id="sl-support-title">Support Sub<span>lens</span></h2>
        <button type="button" class="sl-support-close" data-support-close aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <p class="sl-support-text sl-support-lead">
        Sublens is free, open source, and has no ads and no tracking. It also
        runs inside three players it does not control: Netflix, YouTube and
        Prime Video reshape their caption markup without warning, and a change
        nobody announces can quietly break subtitles that worked yesterday.
      </p>
      <p class="sl-support-text">
        Keeping it working means chasing those changes down one player at a
        time, in someone's spare time. Any of these three helps.
      </p>
      <div class="sl-support-options">
        ${options
          .map(
            o => `
        <a class="sl-support-option ${o.cls}" href="${o.link}" target="_blank" rel="noopener noreferrer">
          <span class="sl-support-icon" aria-hidden="true">${o.icon}</span>
          <span class="sl-support-body">
            <span class="sl-support-name">${o.name}</span>
            <span class="sl-support-desc">${o.desc}</span>
          </span>
          ${arrow}
        </a>`
          )
          .join("")}
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  let lastTrigger = null;

  function open(trigger) {
    lastTrigger = trigger;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    modal.querySelector(".sl-support-close").focus();
  }

  function close() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastTrigger) lastTrigger.focus();
  }

  modal.addEventListener("click", e => {
    if (e.target.closest("[data-support-close], .sl-support-option")) close();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") close();
  });

  document.addEventListener("click", e => {
    const trigger = e.target.closest("[data-support-open]");
    if (!trigger) return;
    e.preventDefault();
    open(trigger);
  });
})();
