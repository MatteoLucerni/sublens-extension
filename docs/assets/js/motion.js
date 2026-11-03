(function () {
  const root = document.documentElement;
  root.classList.add("js");

  const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fineMq = window.matchMedia("(hover: hover) and (pointer: fine)");
  const wideMq = window.matchMedia("(min-width: 1024px)");
  const hasIO = "IntersectionObserver" in window;
  const motion = !reduceMq.matches && hasIO;
  if (motion) root.classList.add("has-motion");

  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

  const LENS_ROWS = [
    ["¿Dónde está la *estación* de tren?", "Je ne sais pas ce que tu *veux* dire.", "Wir sehen uns *morgen* früh.", "Non ho mai *visto* niente di simile.", "Você pode *repetir*, por favor?", "No te *preocupes*, ya llegamos."],
    ["On se retrouve après le *film* ?", "Ich habe keine *Ahnung*, ehrlich.", "Dimmi la *verità*, per favore.", "Ella nunca *dijo* eso.", "Fica comigo só mais um *pouco*.", "C'est exactement ce que je *pensais*."],
    ["Andiamo, è quasi *mezzanotte*.", "¿Por qué no me lo *dijiste* antes?", "Das ist nicht so *einfach*.", "Eu sabia que você *voltaria*.", "Tu as vu la *lumière* là-bas ?", "Lo sapevo fin *dall'inizio*."],
    ["Wo warst du *gestern* Abend?", "Necesito un *momento* a solas.", "Quella *canzone* mi ricorda casa.", "Ce n'est pas *grave*, vraiment.", "A gente se vê *amanhã*.", "Hör auf, mich so *anzusehen*."],
    ["¡Qué *sorpresa* verte aquí!", "J'ai *oublié* mes clés encore.", "Non è colpa *tua*, davvero.", "Isso muda *tudo*, sabia?", "Ich *glaube* dir kein Wort.", "Mañana *empezamos* de nuevo."],
  ];

  const atmosphere = document.createElement("div");
  atmosphere.className = "atmosphere";
  atmosphere.setAttribute("aria-hidden", "true");
  atmosphere.append(document.createElement("div"), document.createElement("div"), document.createElement("div"));
  document.body.prepend(atmosphere);

  const updaters = new Map();
  const active = new Set();
  const toneSections = [...document.querySelectorAll("[data-tone]")];
  let ticking = 0;

  const sectionObserver = hasIO
    ? new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) active.add(entry.target);
            else active.delete(entry.target);
          });
          schedule();
        },
        { rootMargin: "25% 0px 25% 0px" }
      )
    : null;

  function register(el, fn) {
    updaters.set(el, fn);
    if (sectionObserver) sectionObserver.observe(el);
    else active.add(el);
    fn(window.innerHeight);
  }

  function updateTone(vh) {
    if (!toneSections.length) return;
    let tone = toneSections[0].dataset.tone;
    for (const section of toneSections) {
      if (section.getBoundingClientRect().top <= vh * 0.55) tone = section.dataset.tone;
    }
    if (root.dataset.tone !== tone) root.dataset.tone = tone;
  }

  function frame() {
    ticking = 0;
    const vh = window.innerHeight;
    active.forEach(el => updaters.get(el)(vh));
    updateTone(vh);
  }

  function schedule() {
    if (!ticking) ticking = window.requestAnimationFrame(frame);
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });

  function initReveal() {
    const items = [...document.querySelectorAll("[data-reveal]")];
    document.querySelectorAll("[data-reveal-group]").forEach(group => {
      [...group.children].forEach((child, i) => {
        child.style.setProperty("--d", i);
        items.push(child);
      });
    });
    if (!motion || !items.length) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    const vh = window.innerHeight;
    items.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < vh * 0.92 && rect.bottom > 0) return;
      el.classList.add("reveal");
      observer.observe(el);
    });

    document.addEventListener("focusin", e => {
      const el = e.target.closest(".reveal:not(.is-visible)");
      if (el) el.classList.add("is-visible");
    });
  }

  function trackPointer(source, target) {
    let raf = 0;
    let x = 0;
    let y = 0;
    source.addEventListener("pointermove", e => {
      const rect = target.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        target.style.setProperty("--mx", `${x.toFixed(1)}px`);
        target.style.setProperty("--my", `${y.toFixed(1)}px`);
      });
    });
  }

  function initSpotlight() {
    if (!fineMq.matches) return;
    document.querySelectorAll(".spotlight").forEach(el => trackPointer(el, el));
    const mark = document.querySelector(".footer-mark");
    if (mark) trackPointer(mark.closest("footer") || mark, mark);
  }

  function initMagnetic() {
    if (!motion || !fineMq.matches) return;
    document.querySelectorAll("[data-magnetic]").forEach(el => {
      el.addEventListener("pointermove", e => {
        const rect = el.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
        const dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height;
        el.style.setProperty("--mag-x", `${(dx * 12).toFixed(2)}px`);
        el.style.setProperty("--mag-y", `${(dy * 10).toFixed(2)}px`);
      });
      el.addEventListener("pointerleave", () => {
        el.style.removeProperty("--mag-x");
        el.style.removeProperty("--mag-y");
      });
    });
  }

  function buildLensRows(host) {
    const layer = sharp => {
      const el = document.createElement("div");
      el.className = `lens-layer ${sharp ? "lens-sharp" : "lens-blur"}`;
      LENS_ROWS.forEach(row => {
        const rowEl = document.createElement("div");
        rowEl.className = "lens-row";
        for (let pass = 0; pass < 2; pass++) {
          row.forEach(text => {
            const line = document.createElement("span");
            line.className = "lens-line";
            text.split("*").forEach((part, i) => {
              if (!part) return;
              if (i % 2 === 1 && sharp) {
                const mark = document.createElement("mark");
                mark.textContent = part;
                line.append(mark);
              } else {
                line.append(part);
              }
            });
            rowEl.append(line);
          });
        }
        el.append(rowEl);
      });
      return el;
    };
    host.append(layer(false), layer(true));
  }

  function initLens(host) {
    const ring = document.createElement("span");
    ring.className = "lens-ring";
    host.append(ring);

    const target = host.closest("section, main") || host.parentElement;
    let px = 0;
    let py = 0;
    let hover = false;
    let x = null;
    let y = null;
    let raf = 0;
    let visible = true;

    function tick(now) {
      raf = 0;
      const rect = host.getBoundingClientRect();
      let tx;
      let ty;
      if (hover) {
        tx = px - rect.left;
        ty = py - rect.top;
      } else if (motion) {
        const t = now / 1000;
        tx = rect.width * (0.5 + 0.34 * Math.sin(t * 0.31));
        ty = rect.height * (0.5 + 0.26 * Math.sin(t * 0.47 + 1.3));
      } else {
        tx = rect.width / 2;
        ty = rect.height / 2;
      }
      if (x === null) {
        x = tx;
        y = ty;
      }
      const k = motion ? 0.09 : 1;
      x += (tx - x) * k;
      y += (ty - y) * k;
      host.style.setProperty("--lx", `${x.toFixed(1)}px`);
      host.style.setProperty("--ly", `${y.toFixed(1)}px`);
      if (visible && !document.hidden && (motion || hover)) raf = window.requestAnimationFrame(tick);
    }

    function start() {
      if (!raf && visible) raf = window.requestAnimationFrame(tick);
    }

    target.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      hover = true;
      host.classList.add("is-live");
      px = e.clientX;
      py = e.clientY;
      start();
    });

    target.addEventListener("pointerleave", () => {
      hover = false;
      if (!motion) host.classList.remove("is-live");
      start();
    });

    if (hasIO) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible) start();
      }).observe(host);
    }

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) start();
    });

    if (motion) host.classList.add("is-live");
    start();
  }

  function initStory() {
    const grid = document.querySelector("[data-story]");
    if (!grid) return;
    const stage = grid.querySelector(".story-stage");
    const list = grid.querySelector(".story-steps");
    const steps = [...grid.querySelectorAll("[data-story-step]")];
    const counter = grid.querySelector("[data-story-counter]");
    if (!stage || !list || !steps.length) return;
    let current = -1;

    register(grid, vh => {
      let focus = vh * 0.5;
      if (!wideMq.matches) {
        const stageRect = stage.getBoundingClientRect();
        focus = (clamp(stageRect.bottom, 0, vh) + vh) / 2;
      }
      let best = 0;
      let bestDistance = Infinity;
      const centers = steps.map(step => {
        const rect = step.getBoundingClientRect();
        return rect.top + rect.height / 2;
      });
      centers.forEach((center, i) => {
        const distance = Math.abs(center - focus);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      const span = centers[centers.length - 1] - centers[0] || 1;
      list.style.setProperty("--story-progress", clamp((focus - centers[0]) / span).toFixed(4));
      if (best === current) return;
      current = best;
      stage.dataset.step = String(best + 1);
      steps.forEach((step, i) => step.classList.toggle("is-active", i === best));
      if (counter) counter.textContent = String(best + 1).padStart(2, "0");
    });
  }

  function initStatement() {
    document.querySelectorAll("[data-words]").forEach(el => {
      const text = el.textContent.trim().replace(/\s+/g, " ");
      const accent = (el.dataset.accent || "").split(" ").filter(Boolean).map(Number);
      const label = document.createElement("span");
      label.className = "visually-hidden";
      label.textContent = text;
      const words = text.split(" ").map((word, i) => {
        const span = document.createElement("span");
        span.className = accent.includes(i) ? "w w-accent" : "w";
        span.setAttribute("aria-hidden", "true");
        span.textContent = word;
        return span;
      });
      el.textContent = "";
      el.append(label);
      words.forEach((span, i) => {
        if (i) el.append(" ");
        el.append(span);
      });
      if (!motion) return;

      const values = words.map(() => -1);
      register(el, vh => {
        const rect = el.getBoundingClientRect();
        const p = clamp((vh * 0.85 - rect.top) / (vh * 0.5));
        const n = words.length;
        words.forEach((span, i) => {
          const v = Math.round(clamp(p * n - i) * 100) / 100;
          if (v === values[i]) return;
          values[i] = v;
          span.style.setProperty("--w", v);
        });
      });
    });
  }

  function initSteps() {
    const el = document.querySelector("[data-steps]");
    if (!el || !motion) return;
    const items = [...el.children];
    const n = items.length;
    register(el, vh => {
      const rect = el.getBoundingClientRect();
      const p = clamp((vh * 0.85 - rect.top) / (vh * 0.4 + rect.height * 0.3));
      el.style.setProperty("--p", p.toFixed(4));
      items.forEach((item, i) => item.classList.toggle("is-lit", p >= (n > 1 ? i / (n - 1) : 0) - 0.02));
    });
  }

  function initIris() {
    if (!motion) return;
    document.querySelectorAll("[data-iris]").forEach(el => {
      el.classList.add("is-armed");
      const shutter = el.querySelector(".iris-shutter");
      const observer = new IntersectionObserver(
        entries => {
          if (!entries[0].isIntersecting) return;
          el.classList.add("is-playing");
          observer.disconnect();
        },
        { threshold: 0.35 }
      );
      observer.observe(el);
      if (shutter) shutter.addEventListener("animationend", () => el.classList.add("is-open"), { once: true });
      el.addEventListener("focusin", () => el.classList.add("is-playing", "is-open"));
    });
  }

  initReveal();
  initSpotlight();
  initMagnetic();

  document.querySelectorAll("[data-lens]").forEach(host => {
    if (host.hasAttribute("data-lens-rows")) buildLensRows(host);
    initLens(host);
  });

  initStory();
  initStatement();
  initSteps();
  initIris();
  frame();
})();
