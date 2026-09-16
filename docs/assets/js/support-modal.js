(function () {
  const KOFI_LINK = "https://ko-fi.com/D5Y424F3EB";
  const GITHUB_LINK = "https://github.com/MatteoLucerni/netflix-subtitles-translate";
  const REVIEW_LINK =
    "https://chromewebstore.google.com/detail/hkocpinnlehjpbobobnpocanjaaaiijh/reviews";

  const css = `
    .sl-support-trigger {
      display: inline-flex; align-items: center; gap: 8px;
      background: #cfecfb; color: #0284c7;
      border: 1px solid rgba(2, 132, 199, 0.3); border-radius: 8px;
      padding: 9px 18px; font-weight: 600; font-family: inherit; font-size: inherit;
      line-height: 1.5; text-decoration: none; cursor: pointer;
      transition: background .2s ease, border-color .2s ease, color .2s ease, transform .2s ease, box-shadow .2s ease;
    }
    .sl-support-trigger:hover {
      background: #bae3f8; border-color: rgba(2, 132, 199, 0.55);
      color: #0369a1; transform: translateY(-1px);
      box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12), 0 4px 10px rgba(15, 23, 42, 0.06);
    }
    .sl-support-trigger:focus-visible { outline: 2px solid #0284c7; outline-offset: 2px; }

    .sl-support-modal {
      position: fixed; inset: 0; z-index: 100000; display: flex;
      align-items: center; justify-content: center; padding: 24px;
      font-family: "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .sl-support-modal[hidden] { display: none; }

    .sl-support-scrim {
      position: absolute; inset: 0; background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(4px); animation: slSupportFade .16s ease;
    }

    .sl-support-card {
      position: relative; width: 100%; max-width: 440px; max-height: 100%;
      overflow-y: auto; overscroll-behavior: contain; padding: 28px;
      background:
        radial-gradient(600px 280px at 20% -10%, rgba(2, 132, 199, 0.1), transparent 70%),
        #ffffff;
      border: 1px solid #e0e0e0; border-radius: 16px;
      box-shadow: 0 22px 48px rgba(15, 23, 42, 0.22), 0 4px 10px rgba(15, 23, 42, 0.08);
      color: #0f172a; text-align: left;
      animation: slSupportIn .18s ease;
    }

    @keyframes slSupportFade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slSupportIn {
      from { opacity: 0; transform: translateY(10px) scale(.98); }
      to { opacity: 1; transform: none; }
    }

    .sl-support-head {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; margin-bottom: 16px;
    }
    .sl-support-title {
      margin: 0; font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em; color: #0f172a;
    }
    .sl-support-title span { color: #0284c7; }
    .sl-support-close {
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; flex-shrink: 0; padding: 0;
      color: #475569; background: #f2f2f2; border: 1px solid #e0e0e0;
      border-radius: 8px; cursor: pointer;
      transition: color .2s, background .2s, border-color .2s;
    }
    .sl-support-close:hover { color: #0f172a; background: #e8e8e8; border-color: rgba(2, 132, 199, 0.4); }
    .sl-support-close:focus-visible { outline: 2px solid #0284c7; outline-offset: 2px; }
    .sl-support-close svg { width: 15px; height: 15px; }

    .sl-support-text {
      margin: 0 0 16px; font-size: 0.9rem; line-height: 1.6; color: #475569;
    }
    .sl-support-text.sl-lead { color: #0f172a; }

    .sl-support-options { display: flex; flex-direction: column; gap: 10px; }

    .sl-support-option {
      display: flex; align-items: center; gap: 14px; padding: 14px 16px;
      background: #dcdcdc; border: 1px solid #b0b0b0; border-radius: 12px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05), 0 6px 14px rgba(15, 23, 42, 0.06);
      text-decoration: none; color: #0f172a;
      transition: background .2s ease, border-color .2s ease, transform .15s ease, box-shadow .2s ease;
    }
    .sl-support-option:hover {
      background: #e8e8e8; transform: translateY(-1px); color: #0f172a;
      box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12), 0 4px 10px rgba(15, 23, 42, 0.06);
    }
    .sl-support-option:focus-visible { outline: 2px solid #0284c7; outline-offset: 2px; }

    .sl-support-icon {
      display: flex; align-items: center; justify-content: center;
      width: 42px; height: 42px; min-width: 42px; border-radius: 10px;
      color: #0284c7; background: #cfecfb;
    }
    .sl-support-icon svg { width: 20px; height: 20px; }

    .sl-support-option.sl-coffee .sl-support-icon { color: #059669; background: #d1fae5; }
    .sl-support-option.sl-coffee:hover { border-color: #059669; }
    .sl-support-option.sl-github:hover { border-color: #0284c7; }
    .sl-support-option.sl-review .sl-support-icon { color: #d97706; background: #fef3c7; }
    .sl-support-option.sl-review:hover { border-color: #d97706; }

    .sl-support-body { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .sl-support-name { font-size: 0.95rem; font-weight: 600; color: #0f172a; line-height: 1.3; }
    .sl-support-desc { font-size: 0.8rem; line-height: 1.45; color: #475569; }

    .sl-support-arrow {
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      color: #94a3b8; transition: color .2s, transform .2s;
    }
    .sl-support-arrow svg { width: 15px; height: 15px; }
    .sl-support-option:hover .sl-support-arrow { color: #0284c7; transform: translate(2px, -2px); }

    @media (max-width: 480px) {
      .sl-support-modal { padding: 16px; }
      .sl-support-card { padding: 22px 18px; }
    }

    @media (max-height: 560px) {
      .sl-support-modal { padding: 12px; }
      .sl-support-card { padding: 18px; }
      .sl-support-text { margin-bottom: 12px; }
      .sl-support-option { padding: 11px 14px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .sl-support-scrim, .sl-support-card { animation: none; }
      .sl-support-option:hover .sl-support-arrow { transform: none; }
    }
  `;

  const arrow =
    '<span class="sl-support-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M7 17 17 7M9 7h8v8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';

  const iconCoffee =
    '<svg viewBox="0 0 24 24" fill="none"><path d="M2 8h15a3 3 0 0 1 0 6h-1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 8v9a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 2c-.5 1 -1.5 1.5 -1 3M10 2c-.5 1 -1.5 1.5 -1 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const iconGithub =
    '<svg viewBox="0 0 24 24" fill="none"><path d="m8 18-6-6 6-6M16 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const iconStar =
    '<svg viewBox="0 0 24 24" fill="none"><path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.8l6.5-.9z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const options = [
    {
      cls: "sl-coffee",
      icon: iconCoffee,
      link: KOFI_LINK,
      name: "Buy me a coffee",
      desc: "A one-off contribution on Ko-fi. No account and no subscription needed.",
    },
    {
      cls: "sl-github",
      icon: iconGithub,
      link: GITHUB_LINK,
      name: "Contribute on GitHub",
      desc: "Send a pull request, or report a broken subtitle with the title and platform it happened on.",
    },
    {
      cls: "sl-review",
      icon: iconStar,
      link: REVIEW_LINK,
      name: "Leave a review",
      desc: "A rating on the Chrome Web Store costs nothing and helps other learners find the extension.",
    },
  ];

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const modal = document.createElement("div");
  modal.className = "sl-support-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="sl-support-scrim" data-support-close></div>
    <div class="sl-support-card" role="dialog" aria-modal="true" aria-labelledby="sl-support-title">
      <div class="sl-support-head">
        <h2 class="sl-support-title" id="sl-support-title">Support Sub<span>lens</span></h2>
        <button type="button" class="sl-support-close" data-support-close aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
        </button>
      </div>
      <p class="sl-support-text sl-lead">
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
    lastTrigger = trigger || null;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    const close = modal.querySelector(".sl-support-close");
    if (close) close.focus();
  }

  function close() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastTrigger && typeof lastTrigger.focus === "function") lastTrigger.focus();
  }

  modal.addEventListener("click", e => {
    if (e.target.closest("[data-support-close]")) close();
    else if (e.target.closest(".sl-support-option")) close();
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
