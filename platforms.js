const NSE_PLATFORMS = {
  netflix: {
    name: "netflix",
    hostMatch: (host) => /(^|\.)netflix\.com$/.test(host),
    subtitleSelectors: [".player-timedtext", '[class*="timedtext"]'],
    controlsSelectors: [
      '[data-uia="player-controls-wrapper"]',
      '[data-uia="controls-standard"]',
      '[class*="PlayerControlsNeo__layout"]',
      '[class*="PlayerControlsNeo"]'
    ],
    lineContainerSelector: '[class*="timedtext-text-container"]',
    cueRootSelector: '[class*="timedtext-text-container"]',
    usesBackgroundSeek: true,
    processDebounceMs: 0,
    areCaptionsEnabled: () => {
      const root = document.documentElement;
      root.removeAttribute("data-nse-captions");
      document.dispatchEvent(new CustomEvent("nse-captions-query"));
      return root.getAttribute("data-nse-captions") !== "off";
    },
    cleanLineText: (text) => text
  },
  youtube: {
    name: "youtube",
    hostMatch: (host) => /(^|\.)youtube\.com$/.test(host),
    subtitleSelectors: ["#ytp-caption-window-container"],
    controlsSelectors: [".ytp-chrome-bottom"],
    lineContainerSelector: ".caption-visual-line",
    lineContainerFallbackSelector: ".caption-window",
    cueRootSelector: ".caption-window",
    usesBackgroundSeek: false,
    repositionOnlyOnChange: true,
    snapToBottomBand: true,
    controlsGapRatio: 0.03,
    playerFrameSelector: "#movie_player",
    usesImageSubtitleGuard: false,
    isIgnoredLine: (lineEl) => !!lineEl.closest(".caption-window")?.querySelector("svg, img"),
    processDebounceMs: 180,
    areCaptionsEnabled: () => {
      const button = document.querySelector("#movie_player .ytp-subtitles-button");
      if (!button) return true;
      return button.getAttribute("aria-pressed") === "true";
    },
    cleanLineText: (text) =>
      text
        .split("\n")
        .map((line) => line.replace(/>>+/g, " ").replace(/[ \t]+/g, " ").trim())
        .join("\n")
  },
  primevideo: {
    name: "primevideo",
    hostMatch: (host) => /(^|\.)primevideo\.com$/.test(host),
    subtitleSelectors: [".atvwebplayersdk-player-container"],
    controlsSelectors: [],
    lineContainerSelector: ".atvwebplayersdk-captions-text",
    cueRootSelector: ".atvwebplayersdk-captions-text",
    usesBackgroundSeek: false,
    usesImageSubtitleGuard: false,
    allowContainerTextFallback: false,
    repositionOnlyOnChange: true,
    cueBoundaryOnTextChange: true,
    controlsReservedHeightRatio: 0.21,
    snapToBottomBand: true,
    pauseBeforeCueSec: 0.2,
    areCaptionsEnabled: () => {
      try {
        return localStorage.getItem("atvwebplayersdk_html5_previous_captions") !== null;
      } catch (err) {
        return true;
      }
    },
    processDebounceMs: 0,
    cleanLineText: (text) => text,
    selectVideo: () => {
      let best = null;
      let bestArea = -1;
      for (const video of document.querySelectorAll("video")) {
        const rect = video.getBoundingClientRect();
        const area = rect.width * rect.height;
        if (area > bestArea) {
          bestArea = area;
          best = video;
        }
      }
      return best;
    }
  }
};

function nseDetectPlatform() {
  const host = location.hostname;
  for (const platform of Object.values(NSE_PLATFORMS)) {
    if (platform.hostMatch(host)) return platform;
  }
  return NSE_PLATFORMS.netflix;
}

const PLATFORM = nseDetectPlatform();
