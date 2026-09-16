const DEBUG = self.DEV_MODE ?? false;
function log(...args) {
  if (DEBUG) console.log("[NSE]", ...args);
}

const SELECTOR_CHAIN = PLATFORM.subtitleSelectors;
const CONTROLS_SELECTOR_CHAIN = PLATFORM.controlsSelectors;
const FALLBACK_CONTROLS_HEIGHT = 110;
const MAX_CONTROLS_RESERVED_RATIO = 0.3;
const MIN_VIDEO_SIZE_PX = 40;
const BOTTOM_BAND_RATIO = 0.6;
const OVERLAY_SIDE_PADDING_RATIO = 0.02;
const OVERLAY_MIN_SIDE_PADDING_PX = 8;
const LINE_ADJACENT_GAP_PX = 2;
const LAYOUT_CHECK_INTERVAL_MS = 250;
const LAYOUT_SETTLE_MS = 1000;
const FRAME_CLIP_MAX_DEPTH = 12;
const NATIVE_ALIGN_TOLERANCE_PX = 4;
const BLUR_RATIO = 0.24;
const MIN_BLUR_PX = 6;
const MAX_BLUR_PX = 22;
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
const TOKEN_REGEX = /[\p{L}\p{M}'’]+|[^\p{L}\p{M}'’]+/gu;
const NON_WORD_CHAR_REGEX = /[^\p{L}\p{M}'’]/gu;
const LETTER_REGEX = /\p{L}/u;

const SELECTION_DEBOUNCE_MS = 1200;
const CUE_HISTORY_EPSILON_SEC = 0.05;
const PAUSE_BEFORE_NEXT_CUE_SEC = 0.05;
const PAUSE_SCHEDULE_SAFETY_MS = 15000;
const PAUSE_CONFIRM_USER_MS = 600;
const CUE_HISTORY_MAX_AGE_SEC = 30;
const CUE_JUMP_SEEK_GRACE_MS = 3000;
const USER_SEEK_MIN_SEC = 1;

let activeLines = [];
let currentContainer = null;
let maxControlsHeight = 0;
let lastLayoutKey = "";
let layoutPending = false;
let layoutSettleUntil = 0;
let layoutWatchTimer = null;
let videoCache = null;

let extensionPaused = false;
let wasPlayingBeforePause = false;
let selectionStart = null;
let selectionEnd = null;
let selectionTimer = null;

let dragAnchor = null;
let dragActive = false;
let suppressClickAfterDrag = false;
let translationPending = false;
let currentTtsAudio = null;
let ttsRequestId = 0;

let cueHistory = [];
let cueIndex = -1;
let cueHistoryMediaKey = null;
let cueJumpSeekUntil = 0;
let lastKnownVideoTime = 0;
let suppressHistoryCapture = false;
let suppressHistoryCaptureTimer = null;
let pauseScheduleCleanup = null;
let pauseScheduleTimer = null;

let settings = { ...NSE_SETTINGS_DEFAULTS };

function applyBlurSettingToAllOverlays() {
  document.documentElement.classList.toggle("nse-blur-disabled", !settings.subtitleBlurEnabled);
}

function getVideo() {
  if (!PLATFORM.selectVideo) return document.querySelector("video");
  if (videoCache && videoCache.isConnected) return videoCache;
  videoCache = PLATFORM.selectVideo();
  if (videoCache) queueMicrotask(() => { videoCache = null; });
  return videoCache;
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
