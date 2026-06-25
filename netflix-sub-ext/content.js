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
    "letter-spacing"
  ];
  const WORD_CHAR_CLASS = "A-Za-z'";
  const TOKEN_REGEX = new RegExp(`[${WORD_CHAR_CLASS}]+|[^${WORD_CHAR_CLASS}]+`, "g");
  const NON_WORD_CHAR_REGEX = new RegExp(`[^${WORD_CHAR_CLASS}]`, "g");

  const lineState = new Map();

  let extensionPaused = false;
  let wasPlayingBeforePause = false;

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

  function isPopupOpen() {
    return !!document.getElementById("nse-popup");
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
    if (!extensionPaused) return;
    extensionPaused = false;
    if (wasPlayingBeforePause) getVideo()?.play();
  }

  function revealAllOverlays() {
    for (const [, state] of lineState) state.overlay.classList.add("revealed");
  }

  function blurUnheldOverlays() {
    for (const [, state] of lineState) {
      if (state.overlay.dataset.hovered === "true") continue;
      if (isPopupOpen()) continue;
      state.overlay.classList.remove("revealed");
    }
  }

  function attachVideoListeners(video) {
    if (video.dataset.nseListenersAttached) return;
    video.dataset.nseListenersAttached = "true";
    video.addEventListener("pause", revealAllOverlays);
    video.addEventListener("play", blurUnheldOverlays);
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

  function getLineText(lineEl) {
    const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let text = "";
    let node = walker.currentNode;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) text += node.nodeValue;
      else if (node.nodeName === "BR") text += "\n";
    }
    return text;
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
    overlay.style.top = `${rect.bottom}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = "auto";
    overlay.style.transform = "translateY(-100%)";
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
      overlay.dataset.hovered = "true";
      overlay.classList.add("revealed");
      pauseForInteraction();
    });

    overlay.addEventListener("mouseleave", () => {
      delete overlay.dataset.hovered;
      if (isPopupOpen()) return;
      releaseInteraction();
      if (!getVideo()?.paused) overlay.classList.remove("revealed");
    });

    overlay.addEventListener("click", onWordClick);

    if (isPopupOpen() || getVideo()?.paused) overlay.classList.add("revealed");

    getAppendTarget().appendChild(overlay);
    return overlay;
  }

  function renderOverlayForLine(lineEl) {
    const text = getLineText(lineEl);
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
      appendDefinitions(popup, result.definitions);
      appendExamples(popup, result.examples);
    }

    getAppendTarget().appendChild(popup);
    positionPopup(popup, anchorRect);

    document.addEventListener("click", onOutsideClick, { capture: true });
    document.addEventListener("keydown", onEscape);
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

  function appendDefinitions(popup, definitions) {
    if (!Array.isArray(definitions)) return;

    const list = document.createElement("div");
    list.className = "nse-definitions";

    for (const [partOfSpeech, defs] of definitions.slice(0, 2)) {
      if (!partOfSpeech || !Array.isArray(defs)) continue;

      for (const def of defs.slice(0, 2)) {
        const [defText, , example] = def;
        if (!defText) continue;

        const row = document.createElement("div");
        row.className = "nse-definition";

        const pos = document.createElement("span");
        pos.className = "nse-pos";
        pos.textContent = partOfSpeech;
        row.appendChild(pos);
        row.appendChild(document.createTextNode(` ${defText}`));

        if (example) {
          const exampleEl = document.createElement("div");
          exampleEl.className = "nse-def-example";
          exampleEl.textContent = example;
          row.appendChild(exampleEl);
        }

        list.appendChild(row);
      }
    }

    if (list.children.length > 0) popup.appendChild(list);
  }

  function appendHighlighted(container, html) {
    const parts = html.split(/(<b>.*?<\/b>)/g);
    for (const part of parts) {
      const match = part.match(/^<b>(.*?)<\/b>$/);
      if (match) {
        const b = document.createElement("b");
        b.textContent = match[1];
        container.appendChild(b);
      } else if (part) {
        container.appendChild(document.createTextNode(part));
      }
    }
  }

  function appendExamples(popup, examples) {
    if (!Array.isArray(examples)) return;

    const list = document.createElement("div");
    list.className = "nse-examples";

    for (const example of examples.slice(0, 3)) {
      const html = example?.[0];
      if (!html) continue;

      const row = document.createElement("div");
      row.className = "nse-example";
      appendHighlighted(row, html);
      list.appendChild(row);
    }

    if (list.children.length > 0) popup.appendChild(list);
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

    releaseInteraction();
    if (!getVideo()?.paused) blurUnheldOverlays();
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
    if (!video) return;
    attachVideoListeners(video);
    if (video.dataset.nseResizeObserved) return;
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
