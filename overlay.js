function revealAllOverlays() {
  for (const line of activeLines) line.overlay.classList.add("revealed");
}

function blurUnheldOverlays() {
  for (const line of activeLines) {
    if (line.overlay.dataset.hovered === "true") continue;
    if (isPopupOpen()) continue;
    line.overlay.classList.remove("revealed");
  }
}

function onVideoPause(e) {
  const video = e?.target;
  if (extensionPaused) {
    clearPauseSchedule();
  } else if (isPauseScheduled()) {
    setTimeout(() => {
      if (video?.paused) clearPauseSchedule();
    }, PAUSE_CONFIRM_USER_MS);
  } else {
    clearPauseSchedule();
  }
  if (settings.autoRemoveBlurOnPause) revealAllOverlays();
}

function attachVideoListeners(video) {
  if (video.dataset.nseListenersAttached) return;
  video.dataset.nseListenersAttached = "true";
  video.addEventListener("pause", onVideoPause);
  video.addEventListener("play", blurUnheldOverlays);
  video.addEventListener("seeking", onVideoSeeking);
  video.addEventListener("timeupdate", onVideoTimeUpdate);
}

function detachVideoListeners(video) {
  if (!video.dataset.nseListenersAttached) return;
  delete video.dataset.nseListenersAttached;
  video.removeEventListener("pause", onVideoPause);
  video.removeEventListener("play", blurUnheldOverlays);
  video.removeEventListener("seeking", onVideoSeeking);
  video.removeEventListener("timeupdate", onVideoTimeUpdate);
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
  return PLATFORM.cleanLineText(text);
}

function copyComputedStyles(target, source) {
  const computed = getComputedStyle(source);
  for (const prop of STYLE_PROPS) {
    target.style.setProperty(prop, computed.getPropertyValue(prop));
  }

  const fontSize = parseFloat(computed.getPropertyValue("font-size"));
  if (!Number.isNaN(fontSize)) {
    const blur = Math.min(MAX_BLUR_PX, Math.max(MIN_BLUR_PX, fontSize * BLUR_RATIO));
    target.style.setProperty("--nse-blur", `${blur}px`);
  }
}

function toDocumentRect(rect) {
  const offsetX = document.fullscreenElement ? 0 : window.scrollX;
  const offsetY = document.fullscreenElement ? 0 : window.scrollY;
  return {
    top: rect.top + offsetY,
    left: rect.left + offsetX,
    right: rect.left + offsetX + rect.width,
    bottom: rect.bottom + offsetY,
    width: rect.width,
    height: rect.height
  };
}

function findControlsElement() {
  for (const selector of CONTROLS_SELECTOR_CHAIN) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

function getControlsReservedHeight(frame) {
  const maxReserved = frame.height * MAX_CONTROLS_RESERVED_RATIO;
  const el = findControlsElement();
  if (el) {
    const height = el.getBoundingClientRect().height;
    if (height > 0 && height <= maxReserved) maxControlsHeight = Math.max(maxControlsHeight, height);
  }
  let reserved = FALLBACK_CONTROLS_HEIGHT;
  if (maxControlsHeight > 0) {
    reserved = maxControlsHeight;
  } else if (PLATFORM.controlsReservedHeightRatio) {
    reserved = Math.max(FALLBACK_CONTROLS_HEIGHT, frame.height * PLATFORM.controlsReservedHeightRatio);
  }
  reserved += frame.height * (PLATFORM.controlsGapRatio ?? 0);
  return Math.min(reserved, maxReserved);
}

function getTextRect(lineEl) {
  const range = document.createRange();
  range.selectNodeContents(lineEl);
  const textRect = range.getBoundingClientRect();
  if (textRect.width > 0 && textRect.height > 0) return textRect;
  const boxRect = lineEl.getBoundingClientRect();
  if (boxRect.width > 0 && boxRect.height > 0) return boxRect;
  return null;
}

function getLayoutFrame() {
  const video = getVideo();
  if (!video) return null;
  const rect = video.getBoundingClientRect();
  if (rect.width < MIN_VIDEO_SIZE_PX || rect.height < MIN_VIDEO_SIZE_PX) return null;
  return toDocumentRect(rect);
}

function getLayoutKey(frame) {
  const box = [frame.left, frame.top, frame.width, frame.height].map(Math.round).join(",");
  return document.fullscreenElement ? `${box}:fs` : box;
}

function isLayoutFrozen() {
  if (isInteractionLocked() || dragActive || translationPending) return true;
  return activeLines.some((line) => line.overlay.matches(":hover"));
}

function applyOverlayFont(overlay, lineEl, maxWidth) {
  copyComputedStyles(overlay, findStyleSource(lineEl));
  const width = overlay.offsetWidth;
  if (width === 0 || width <= maxWidth) return width;
  const fontSize = parseFloat(overlay.style.getPropertyValue("font-size"));
  if (Number.isNaN(fontSize)) return width;
  overlay.style.setProperty("font-size", `${(fontSize * maxWidth) / width}px`);
  return overlay.offsetWidth;
}

function layoutOverlays() {
  if (activeLines.length === 0) {
    layoutPending = false;
    return;
  }
  const frame = getLayoutFrame();
  if (!frame) {
    layoutPending = true;
    return;
  }
  const key = getLayoutKey(frame);
  if (key !== lastLayoutKey) {
    lastLayoutKey = key;
    maxControlsHeight = 0;
    layoutSettleUntil = performance.now() + LAYOUT_SETTLE_MS;
  }

  const frozen = isLayoutFrozen();
  const entries = [];
  for (const line of activeLines) {
    if (frozen && !line.overlay.classList.contains("nse-unplaced")) continue;
    if (!line.lineEl.isConnected) continue;
    const rect = getTextRect(line.lineEl);
    if (rect) entries.push({ line, rect: toDocumentRect(rect) });
  }
  layoutPending = frozen || entries.length < activeLines.length;
  if (entries.length === 0) return;

  entries.sort((a, b) => a.rect.top - b.rect.top);
  const sidePadding = Math.max(OVERLAY_MIN_SIDE_PADDING_PX, frame.width * OVERLAY_SIDE_PADDING_RATIO);
  const maxWidth = Math.max(0, frame.width - sidePadding * 2);
  for (const entry of entries) {
    entry.width = applyOverlayFont(entry.line.overlay, entry.line.lineEl, maxWidth);
    entry.height = entry.line.overlay.offsetHeight;
  }

  const nativeBottom = Math.max(...entries.map((entry) => entry.rect.bottom));
  const pinnedBottom = frame.bottom - getControlsReservedHeight(frame);
  const inBottomBand = nativeBottom >= frame.top + frame.height * BOTTOM_BAND_RATIO;
  const anchorBottom = PLATFORM.snapToBottomBand && inBottomBand
    ? pinnedBottom
    : Math.min(nativeBottom, pinnedBottom);

  let upperLimit = Infinity;
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    const below = entries[i + 1];
    const adjacent = below && below.rect.top - entry.rect.bottom <= LINE_ADJACENT_GAP_PX;
    const bottom = adjacent
      ? upperLimit
      : Math.min(anchorBottom - (nativeBottom - entry.rect.bottom), upperLimit);
    const centerX = entry.rect.left + entry.rect.width / 2;
    const minLeft = frame.left + sidePadding;
    const maxLeft = frame.right - sidePadding - entry.width;
    const left = Math.max(minLeft, Math.min(centerX - entry.width / 2, maxLeft));

    const overlay = entry.line.overlay;
    overlay.style.top = `${bottom}px`;
    overlay.style.left = `${left}px`;
    overlay.style.width = "auto";
    overlay.style.height = "auto";
    overlay.style.transform = "translateY(-100%)";
    overlay.classList.remove("nse-unplaced");
    upperLimit = bottom - entry.height;
  }
}

function repositionAllOverlays() {
  layoutSettleUntil = performance.now() + LAYOUT_SETTLE_MS;
  layoutOverlays();
}

function checkOverlayLayout() {
  if (activeLines.length === 0) return;
  const frame = getLayoutFrame();
  const keyChanged = !!frame && getLayoutKey(frame) !== lastLayoutKey;
  if (keyChanged || layoutPending || performance.now() < layoutSettleUntil) layoutOverlays();
}

function buildTokens(text) {
  const parts = text.match(TOKEN_REGEX) ?? [];
  return parts.map((part) => {
    if (!LETTER_REGEX.test(part)) return document.createTextNode(part);

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
  overlay.className = "nse-overlay nse-unplaced";
  copyComputedStyles(overlay, findStyleSource(lineEl));

  overlay.addEventListener("mouseenter", () => {
    overlay.dataset.hovered = "true";
    overlay.classList.add("revealed");
    if (settings.autoPauseOnHover) pauseForInteraction();
  });

  overlay.addEventListener("mouseleave", () => {
    delete overlay.dataset.hovered;
    if (isPopupOpen() || selectionStart !== null || translationPending) return;
    if (settings.autoPauseOnHover) releaseInteraction();
    if (!getVideo()?.paused) overlay.classList.remove("revealed");
  });

  overlay.addEventListener("mousedown", onWordMouseDown);
  overlay.addEventListener("click", onWordClick);

  if (isPopupOpen() || getVideo()?.paused) overlay.classList.add("revealed");

  getAppendTarget().appendChild(overlay);
  return overlay;
}

function reconcileLines(lineContainers) {
  const incoming = lineContainers.map((lineEl) => ({ lineEl, text: getLineText(lineEl) }));
  const usedOldIndexes = new Set();
  const newActiveLines = [];
  let hasNewCue = false;
  let hasRemovedCue = false;
  let textChanged = false;

  for (const { lineEl, text } of incoming) {
    let matchIndex = activeLines.findIndex(
      (line, idx) => !usedOldIndexes.has(idx) && line.lineEl === lineEl
    );
    if (matchIndex === -1) {
      matchIndex = activeLines.findIndex(
        (line, idx) => !usedOldIndexes.has(idx) && line.lastText === text
      );
    }

    if (matchIndex !== -1) {
      usedOldIndexes.add(matchIndex);
      const line = activeLines[matchIndex];
      line.lineEl = lineEl;
      lineEl.style.visibility = "hidden";
      if (line.lastText !== text) {
        line.overlay.replaceChildren(...buildTokens(text));
        line.lastText = text;
        textChanged = true;
      }
      newActiveLines.push(line);
    } else {
      log("reconcileLines: new/changed text", JSON.stringify(text));
      hasNewCue = true;
      const overlay = createOverlay(lineEl);
      overlay.replaceChildren(...buildTokens(text));
      lineEl.style.visibility = "hidden";
      newActiveLines.push({ lineEl, overlay, lastText: text });
    }
  }

  for (let i = 0; i < activeLines.length; i++) {
    if (!usedOldIndexes.has(i)) {
      activeLines[i].overlay.remove();
      hasRemovedCue = true;
    }
  }

  activeLines = newActiveLines;
  const layoutChanged = hasNewCue || hasRemovedCue || textChanged;
  const settling = performance.now() < layoutSettleUntil;
  if (!PLATFORM.repositionOnlyOnChange || layoutChanged || settling) layoutOverlays();

  const textBoundary = !!PLATFORM.cueBoundaryOnTextChange && textChanged;
  if (hasRemovedCue || textBoundary) markCueEnded();
  if (hasNewCue || textBoundary) recordCueStart();
}

function removeAllOverlays() {
  if (activeLines.length > 0) markCueEnded();
  for (const line of activeLines) {
    line.overlay.remove();
    if (line.lineEl) line.lineEl.style.visibility = "";
  }
  activeLines = [];
  layoutPending = false;
}

function getOrderedOverlays() {
  return activeLines
    .map((line) => line.overlay)
    .filter((overlay) => overlay.isConnected)
    .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
}

function getOrderedWordSpans() {
  const spans = [];
  for (const overlay of getOrderedOverlays()) {
    spans.push(...overlay.querySelectorAll(".nse-word"));
  }
  return spans;
}

function getSubtitleBoundsRect() {
  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  let found = false;

  for (const line of activeLines) {
    if (!line.overlay.isConnected) continue;
    const rect = line.overlay.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    found = true;
    top = Math.min(top, rect.top);
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }

  if (!found) return null;
  return toDocumentRect({ top, left, bottom, width: right - left, height: bottom - top });
}
