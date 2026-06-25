(() => {
  const DEBUG = true;
  function log(...args) {
    if (DEBUG) console.log("[NSE]", ...args);
  }

  log("content script loaded", location.href);

  const SELECTOR_CHAIN = [".player-timedtext", '[class*="timedtext"]'];
  const STYLE_PROPS = [
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "color",
    "text-shadow",
    "line-height",
    "text-align",
    "white-space",
    "letter-spacing"
  ];
  const WORD_CHAR_CLASS = "A-Za-z'";
  const TOKEN_REGEX = new RegExp(`[${WORD_CHAR_CLASS}]+|[^${WORD_CHAR_CLASS}]+`, "g");
  const NON_WORD_CHAR_REGEX = new RegExp(`[^${WORD_CHAR_CLASS}]`, "g");

  const lineState = new Map();

  let extensionPaused = false;
  let wasPlayingBeforePause = false;
  let controlsKeepAliveInterval = null;

  function getVideo() {
    return document.querySelector("video");
  }

  function getAppendTarget() {
    return document.fullscreenElement ?? document.body;
  }

  function reparentToCurrentTarget(el) {
    const target = getAppendTarget();
    if (el.parentElement !== target) target.appendChild(el);
  }

  function startControlsKeepAlive() {
    if (controlsKeepAliveInterval) return;
    controlsKeepAliveInterval = setInterval(() => {
      const video = getVideo();
      if (!video) return;
      const rect = video.getBoundingClientRect();
      video.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        })
      );
    }, 2000);
  }

  function stopControlsKeepAlive() {
    clearInterval(controlsKeepAliveInterval);
    controlsKeepAliveInterval = null;
  }

  function pauseForInteraction() {
    const video = getVideo();
    if (!video) return;
    if (!extensionPaused) {
      wasPlayingBeforePause = !video.paused;
      extensionPaused = true;
    }
    video.pause();
  }

  function releaseInteraction() {
    extensionPaused = false;
    if (wasPlayingBeforePause) getVideo()?.play();
  }

  function findSubtitleContainer() {
    for (const selector of SELECTOR_CHAIN) {
      const el = document.querySelector(selector);
      if (el) {
        log("container found via selector", selector, el);
        return el;
      }
    }
    const fallback = findStructuralFallback();
    if (fallback) log("container found via structural fallback", fallback);
    return fallback;
  }

  function findStructuralFallback() {
    const video = getVideo();
    if (!video) {
      log("structural fallback: no video element found");
      return null;
    }
    const videoRect = video.getBoundingClientRect();

    for (const div of document.querySelectorAll("div")) {
      if (getComputedStyle(div).position !== "absolute") continue;
      if (!div.textContent.trim()) continue;

      const rect = div.getBoundingClientRect();
      const insideVideo =
        rect.left >= videoRect.left &&
        rect.right <= videoRect.right &&
        rect.top >= videoRect.top &&
        rect.bottom <= videoRect.bottom;

      if (insideVideo) return div.parentElement ?? div;
    }
    return null;
  }

  function hasImageSubtitles(container) {
    return !!container.querySelector("svg, img");
  }

  function getLineContainers(container) {
    const matches = container.querySelectorAll('[class*="timedtext-text-container"]');
    if (matches.length > 0) return Array.from(matches);
    return container.textContent.trim() ? [container] : [];
  }

  function logDomSnapshot(container) {
    log("container.outerHTML", container.outerHTML);
    log("container.textContent", JSON.stringify(container.textContent));
  }

  function findStyleSource(lineEl) {
    const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT);
    const textNode = walker.nextNode();
    return textNode?.parentElement ?? lineEl;
  }

  function copyComputedStyles(target, source) {
    const computed = getComputedStyle(source);
    for (const prop of STYLE_PROPS) {
      target.style.setProperty(prop, computed.getPropertyValue(prop));
    }
  }

  function toDocumentRect(rect) {
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      bottom: rect.bottom + window.scrollY,
      width: rect.width,
      height: rect.height
    };
  }

  function positionOverlay(overlay, lineEl) {
    const rect = toDocumentRect(lineEl.getBoundingClientRect());
    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  }

  function repositionAllOverlays() {
    for (const [lineEl, state] of lineState) {
      if (!lineEl.isConnected) continue;
      positionOverlay(state.overlay, lineEl);
    }
  }

  function buildTokens(text) {
    const parts = text.match(TOKEN_REGEX) ?? [];
    return parts.map((part) => {
      if (!/[A-Za-z]/.test(part)) return document.createTextNode(part);

      const span = document.createElement("span");
      span.className = "nse-word";
      span.dataset.word = part;
      span.textContent = part;
      return span;
    });
  }

  function createOverlay(lineEl) {
    log("creating overlay for line", lineEl);
    const overlay = document.createElement("div");
    overlay.className = "nse-overlay";
    copyComputedStyles(overlay, findStyleSource(lineEl));

    overlay.addEventListener("mouseenter", () => {
      overlay.classList.add("revealed");
      pauseForInteraction();
    });

    overlay.addEventListener("mouseleave", () => {
      if (document.getElementById("nse-popup")) return;
      overlay.classList.remove("revealed");
      releaseInteraction();
    });

    overlay.addEventListener("click", onWordClick);

    getAppendTarget().appendChild(overlay);
    return overlay;
  }

  function renderOverlayForLine(lineEl) {
    const text = lineEl.textContent;
    const state = lineState.get(lineEl);

    if (state && state.lastText === text) {
      positionOverlay(state.overlay, lineEl);
      return;
    }

    log("renderOverlayForLine: new/changed text", JSON.stringify(text));

    const overlay = state?.overlay ?? createOverlay(lineEl);
    overlay.replaceChildren(...buildTokens(text));

    lineEl.style.visibility = "hidden";
    positionOverlay(overlay, lineEl);
    log("overlay positioned", overlay.getBoundingClientRect());

    lineState.set(lineEl, { overlay, lastText: text });
  }

  function cleanupStaleOverlays(seenLines) {
    for (const [lineEl, state] of lineState) {
      if (seenLines.has(lineEl)) continue;
      state.overlay.remove();
      lineState.delete(lineEl);
    }
  }

  function removeAllOverlays() {
    cleanupStaleOverlays(new Set());
  }

  function processSubtitle(container) {
    log("processSubtitle fired");
    logDomSnapshot(container);

    if (hasImageSubtitles(container)) {
      log("image subtitles detected, skipping");
      removeAllOverlays();
      return;
    }

    const lineContainers = getLineContainers(container);
    log("lineContainers found", lineContainers.length, lineContainers);
    if (lineContainers.length === 0) {
      removeAllOverlays();
      return;
    }

    const seenLines = new Set(lineContainers);
    lineContainers.forEach(renderOverlayForLine);
    cleanupStaleOverlays(seenLines);
  }

  async function onWordClick(e) {
    log("overlay click", e.target);
    const span = e.target.closest(".nse-word");
    if (!span) {
      log("click target is not a .nse-word span, ignoring");
      return;
    }

    e.stopPropagation();
    pauseForInteraction();

    const word = span.dataset.word.replace(NON_WORD_CHAR_REGEX, "");
    log("word clicked", word);
    if (!word) return;

    const anchorRect = span.getBoundingClientRect();

    let result;
    try {
      result = await chrome.runtime.sendMessage({ type: "translate", word });
      log("translate response", result);
    } catch (err) {
      log("translate request threw", err);
      result = { error: true };
    }
    showPopup(anchorRect, result);
  }

  function showPopup(anchorRect, result) {
    removePopup();

    const popup = document.createElement("div");
    popup.id = "nse-popup";

    if (!result || result.error) {
      const error = document.createElement("div");
      error.className = "nse-error";
      error.textContent = "Translation unavailable";
      popup.appendChild(error);
    } else {
      const wordLabel = document.createElement("div");
      wordLabel.className = "nse-word-label";
      wordLabel.textContent = result.word;
      popup.appendChild(wordLabel);

      const translation = document.createElement("div");
      translation.className = "nse-translation";
      translation.textContent = result.translation ?? "-";
      popup.appendChild(translation);

      appendEntries(popup, result.entries);
    }

    getAppendTarget().appendChild(popup);
    positionPopup(popup, anchorRect);

    document.addEventListener("click", onOutsideClick, { capture: true });
    document.addEventListener("keydown", onEscape);
    startControlsKeepAlive();
  }

  function appendEntries(popup, entries) {
    if (!Array.isArray(entries)) return;

    const list = document.createElement("div");
    list.className = "nse-entries";

    for (const [partOfSpeech, definitions] of entries) {
      if (!partOfSpeech || !Array.isArray(definitions)) continue;

      const row = document.createElement("div");
      row.className = "nse-entry";

      const pos = document.createElement("span");
      pos.className = "nse-pos";
      pos.textContent = partOfSpeech;

      row.appendChild(pos);
      row.appendChild(document.createTextNode(` ${definitions.slice(0, 5).join(", ")}`));
      list.appendChild(row);
    }

    popup.appendChild(list);
  }

  function positionPopup(popup, anchorViewportRect) {
    const anchor = toDocumentRect(anchorViewportRect);
    const popupRect = popup.getBoundingClientRect();

    let top = anchor.top - popupRect.height - 8;
    let left = anchor.left;

    if (top < window.scrollY + 8) top = anchor.bottom + 8;
    if (left + popupRect.width > window.scrollX + window.innerWidth - 8) {
      left = window.scrollX + window.innerWidth - popupRect.width - 8;
    }
    if (left < window.scrollX + 8) left = window.scrollX + 8;

    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
  }

  function removePopup() {
    const popup = document.getElementById("nse-popup");
    if (!popup) return;

    popup.remove();
    document.removeEventListener("click", onOutsideClick, { capture: true });
    document.removeEventListener("keydown", onEscape);
    stopControlsKeepAlive();

    for (const [, state] of lineState) state.overlay.classList.remove("revealed");
    releaseInteraction();
  }

  function onOutsideClick(e) {
    const popup = document.getElementById("nse-popup");
    if (popup && popup.contains(e.target)) return;
    removePopup();
  }

  function onEscape(e) {
    if (e.key === "Escape") removePopup();
  }

  function watchContainer(container) {
    log("watchContainer started", container);
    const observer = new MutationObserver(() => processSubtitle(container));
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["style"]
    });
    processSubtitle(container);
    observeVideoResize();
  }

  function observeVideoResize() {
    const video = getVideo();
    if (!video || video.dataset.nseResizeObserved) return;
    video.dataset.nseResizeObserved = "true";
    const resizeObserver = new ResizeObserver(() => repositionAllOverlays());
    resizeObserver.observe(video);
  }

  function init() {
    log("init() called");
    const existing = findSubtitleContainer();
    if (existing) {
      watchContainer(existing);
      return;
    }

    log("no existing container, starting bodyObserver fallback scan");
    let debounceTimer = null;
    const bodyObserver = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const container = findSubtitleContainer();
        if (!container) return;
        log("bodyObserver found container, switching to watchContainer");
        bodyObserver.disconnect();
        watchContainer(container);
      }, 150);
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  }

  window.addEventListener("resize", repositionAllOverlays);

  document.addEventListener("fullscreenchange", () => {
    log("fullscreenchange", document.fullscreenElement);
    for (const [, state] of lineState) reparentToCurrentTarget(state.overlay);
    removePopup();
    repositionAllOverlays();
  });

  init();
})();
