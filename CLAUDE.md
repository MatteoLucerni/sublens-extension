# Sublens: Project Instructions

## What this is

A Chrome MV3 extension for Netflix, YouTube and Amazon Prime Video: blurs subtitles until revealed, and turns words into clickable translation/dictionary/pronunciation lookups. Plain vanilla JS/CSS/HTML, with no build tool, bundler, or npm/Node project. Every file must stay directly loadable as an unpacked extension as-is.

## Platforms

Three supported platforms, selected automatically from the page hostname in `platforms.js`:

- **Netflix** (`netflix.com/*`): subtitle DOM via timedtext selectors; player seek via MAIN-world Netflix player API (background); source-language detection via the Netflix timed-text track. The captions on/off state for the back-arrow jump is read synchronously through `netflix-bridge.js` (see File layout): the `areCaptionsEnabled` hook clears `data-nse-captions` on `<html>`, dispatches the `nse-captions-query` DOM event (handled synchronously in the MAIN world), and reads the attribute back; the track counts as off when `isNoneTrack` or `isForcedNarrative` is true. The timedtext container is `display: none` between cues too, so it cannot be used as an on/off signal.
- **YouTube** (`youtube.com/watch` pages only): captions via `#ytp-caption-window-container`; player seek done directly on the HTML5 `<video>` element (no MAIN world); source-language detection via `#movie_player.getOption("captions","track")`. Auto-generated (rollup) captions render progressively word-by-word, handled by `processDebounceMs` and the hybrid line matching in `reconcileLines`. The `>>` speaker-change markers YouTube puts in captions are stripped by the platform's `cleanLineText` hook before tokenizing. On YouTube the overlay line block gets a semi-transparent black background (via `html.nse-platform-youtube .nse-overlay` in `content.css`, horizontal padding only) so white text stays readable over bright scenes; with no vertical padding the per-line blocks tile into a continuous band instead of overlapping. On YouTube `reconcileLines` only repositions overlays when the cue content changes (new/removed line or changed text) or while the layout is settling after a video size/position change, so YouTube's transient caption-window shifts when the controls appear no longer move the clickable words; Netflix still repositions on every reconcile. YouTube also sets `snapToBottomBand: true` and `controlsGapRatio: 0.03` (see Overlay layout). When captions are turned on, YouTube shows a hint caption window ("click the gear for settings") that contains an icon; YouTube therefore sets `usesImageSubtitleGuard: false` (otherwise the SVG check in `processSubtitle` would drop every overlay while the hint is visible) and an `isIgnoredLine` hook that skips lines inside a `.caption-window` containing `svg`/`img`, applied by `filterIgnoredLines` in `getLineContainers`. Its `.caption-visual-line` box is as wide as the caption window, not the text, which is why overlays are centered on the `Range` text box. Source-language detection prefers the active track's `translationLanguage` when set, so auto-translated tracks (e.g. "English >> Italian") are detected as the displayed language, not the original.
- **Prime Video** (`primevideo.com/*` only): the observed subtitle container is `.atvwebplayersdk-player-container` (the only non-hashed, stable class in the caption's ancestor chain; the caption spans live inside it). Each caption line is a `span.atvwebplayersdk-captions-text` (`lineContainerSelector`); the trailing hashed class on it and every wrapper class in between change between builds and must not be used. Multi-row lines are `<br>`-separated, which `getLineText` already turns into `"\n"`. Player seek is done directly on the HTML5 `<video>` (`usesBackgroundSeek: false`). Prime renders multiple `<video>` elements (main plus ad/preview slots), so the platform provides a `selectVideo` hook that picks the largest-area one; `getVideo` in `core.js` uses `PLATFORM.selectVideo` when present. Because the active video is not necessarily the largest at startup, `processSubtitle` re-runs `observeVideoResize` each time so the `pause`/`play` listeners (which drive reveal-on-pause / blur-on-play) stay attached to the current video rather than a stale idle one. Prime also reuses a single caption element and rewrites its text in place for each new line instead of creating a fresh element per cue, so `reconcileLines` would only ever see `matched-by-element` and never advance the cue history; `cueBoundaryOnTextChange: true` makes a text change on a reused line count as a cue boundary (`markCueEnded` + `recordCueStart`), which is what the ArrowLeft back-jump relies on. Because the observed container also holds control SVGs and UI text, Prime sets `usesImageSubtitleGuard: false` (the SVG-based image-subtitle guard in `processSubtitle` is skipped; bitmap-subtitle titles simply produce no caption spans and fall back to native rendering) and `allowContainerTextFallback: false` (the `[container]` text fallback in `getLineContainers` is disabled so player title/timer text is never tokenized). The controls bar has no stable class, so `controlsSelectors` is empty; instead of the fixed `FALLBACK_CONTROLS_HEIGHT`, overlay positioning reserves a share of the video height via `controlsReservedHeightRatio` (used in `getControlsReservedHeight`), so the subtitle always sits above where the controls appear regardless of whether they are currently visible. The captions on/off state for the back-arrow jump comes from the `areCaptionsEnabled` hook, which reads `localStorage`'s `atvwebplayersdk_html5_previous_captions` key: Prime stores the active caption track there while captions are on and removes the key when they are turned off. The caption span count is 0 both between cues and with captions off, and the controls-bar captions button is only in the DOM while the controls are visible (and has a localized label), so neither is used. The page path does not change between episodes, but the video `currentSrc` does, so `getCueMediaKey` still resets the cue history on episode change. Source-language detection has no player API, so `background.js` resolves Prime to `"auto"` (Google auto-detect); pronunciation uses the detected `sourceLang`. Fullscreen uses the real Fullscreen API (`document.fullscreenElement` is `dv-player-fullscreen`), so the existing `getAppendTarget` reparenting works unchanged. The overlay gets the same semi-transparent background as YouTube via `html.nse-platform-primevideo .nse-overlay`. Prime periodically rewrites the caption span's inline `style`, which wiped the JS `visibility:hidden` applied in `reconcileLines` and made the native caption flicker back over the blurred overlay, so the native caption is hidden with a persistent CSS rule (`html.nse-platform-primevideo .atvwebplayersdk-captions-text { visibility: hidden !important }`), mirroring YouTube's `.ytp-caption-segment` hide. Prime also sets `repositionOnlyOnChange: true` (the generalized flag that drives the `reconcileLines` reposition guard, previously hardcoded to YouTube), so overlays are repositioned only when the cue content changes and Prime's caption shift when the controls appear no longer moves the clickable words; Netflix (no flag) still repositions on every reconcile.

All platform-specific details live in `platforms.js`'s `PLATFORM` object. Keep new platform branches there, not scattered across the other files.

## File layout (flat, repo root)

- `manifest.json`: MV3 manifest.
- `env.js`: single logging flag (`self.DEV_MODE`). Loaded first as a content script and via `importScripts("env.js")` in `background.js`. The production build (`build.ps1`) rewrites it to `self.DEV_MODE = false`.
- `netflix-bridge.js`: Netflix-only content script declared in a second `content_scripts` entry with `"world": "MAIN"`. Listens for the `nse-captions-query` DOM event and writes the Netflix player's captions state (`on` / `off` / `unknown`) to `data-nse-captions` on `<html>`. Has no dependency on the isolated-world scripts.
- `background.js`: service worker, handles platform-aware player seek (Netflix MAIN world script injection), Google Translate calls, and Google Translate text-to-speech (`tts` message / `fetchTts`). Also opens the welcome page on first install (`chrome.runtime.onInstalled`, reason `install`, `chrome.tabs.create` to `https://getsublens.com/welcome.html`). All its logs go through a local `log()` gated by `self.DEV_MODE`.
- `content.css`: styles for the subtitle overlay and dictionary popup.
- `popup.html` / `popup.css` / `popup.js`: toolbar action popup with the settings controls.
- `icons/`: icon16/32/48/128.png.
- `build.ps1`: packages the extension into `dist/Sublens-<version>-<timestamp>.zip` for the Chrome Web Store, reading the file list from `manifest.json` and forcing `self.DEV_MODE = false` in `env.js`.
- `docs/`: static marketing/documentation site (landing, `welcome.html`, `privacy.html`), published via GitHub Pages (deploy-from-branch `/docs`) on getsublens.com.

### Content scripts (injected into `netflix.com`, `youtube.com` and `primevideo.com`)

The content-script logic is split across several classic scripts that share **one
isolated-world global scope**. They are listed in `manifest.json`'s
`content_scripts.js` array and loaded **in this exact order**:

1. `env.js`: sets `self.DEV_MODE` (the single logging flag). Must load first so `core.js` can read it. The production build forces it to `false`.
2. `settings.js`: shared globals (`NSE_SETTINGS_DEFAULTS`, `NSE_LANGUAGES`, `nseGetSettings`, `nseSetSetting`, `nseOnSettingsChanged`, onboarding helpers). Also loaded before `popup.js` in `popup.html`.
3. `platforms.js`: platform adapter (`NSE_PLATFORMS`, `nseDetectPlatform`, `PLATFORM`). Holds all platform-specific config (subtitle/controls selectors, line-container + cue-root selectors, `usesBackgroundSeek`, `processDebounceMs`, `cleanLineText`, and optional hooks/flags: `selectVideo`, `usesImageSubtitleGuard`, `allowContainerTextFallback`, `areCaptionsEnabled`, `isIgnoredLine`, `repositionOnlyOnChange`, `cueBoundaryOnTextChange`, `snapToBottomBand`, `controlsGapRatio`, `controlsReservedHeightRatio`, `playerFrameSelector`, `pauseBeforeCueSec`). No dependency on `core.js` (does not use `log`).
4. `core.js`: config constants (selectors derived from `PLATFORM`, regexes, thresholds), all shared mutable state (`activeLines`, `cueHistory`, `cueIndex`, selection/drag state, `settings`, timers), and base helpers (`DEBUG = self.DEV_MODE ?? false`, `log`, `getVideo`, `getAppendTarget`, `isPopupOpen`, `applyBlurSettingToAllOverlays`).
5. `overlay.js`: subtitle overlay rendering: style copying, the layout engine (`layoutOverlays`, `checkOverlayLayout`, `repositionAllOverlays`), tokenizing, `reconcileLines` (hybrid element/text matching, per-line cue boundary), blur/reveal.
6. `cues.js`: cue history and ArrowLeft back-jump navigation (`recordCueStart`, `markCueEnded`, `resetCueHistory`, `getPreviousCue`, `jumpToPreviousCue`, `onVideoSeeking`, pause scheduling).
7. `interaction.js`: word/phrase selection (click / Ctrl+click / drag) and the translation popup.
8. `content.js`: **entry point**: subtitle-container discovery and a persistent container watchdog (`syncSubtitleContainer`, re-attaches when the player replaces the subtitle container or on SPA navigation), `seekPlayer`, onboarding, `init`, and **all top-level execution / event wiring** (including the YouTube `yt-navigate-finish` cue-history reset).

This order is load-bearing in two ways:
- **Cross-file sharing**: top-level `const`/`let`/`function` declarations are shared across these scripts (e.g. `settings.js`'s `NSE_SETTINGS_DEFAULTS` is read by `core.js`). If the order is reversed, those globals are undefined at use time and the extension breaks.
- **Declarations vs. execution**: `platforms.js` evaluates one top-level expression (`const PLATFORM = nseDetectPlatform()`) and is otherwise declarations; files 3 to 6 contain *only* declarations. ALL other top-level execution (the settings-load `.then`, `chrome.storage.onChanged` / `addEventListener` wiring, `init()`, `showOnboardingIfFirstRun()`) lives in `content.js`, which loads last, so every referenced symbol already exists. Keep new top-level execution in `content.js`, and keep function names unique across these files (they share one scope).

## Overlay layout

All overlay positioning goes through `layoutOverlays` in `overlay.js`:

- **Frame**: the visible part of the active video (`getLayoutFrame` / `getVisibleVideoRect`): the `<video>` rect clipped by every ancestor with non-visible overflow (up to `FRAME_CLIP_MAX_DEPTH` levels) and by the optional `PLATFORM.playerFrameSelector` ancestor (`#movie_player` on YouTube, whose `<video>` element can stay larger than the player after theater mode or a window resize). No layout happens while the frame is missing or smaller than `MIN_VIDEO_SIZE_PX`.
- **Native measurement**: `measureNativeLine` measures each line's real text box with a DOM `Range`, falling back to the element box; zero-size lines are skipped and the layout is retried later (`layoutPending`). `getNativeAlignment` compares the text box with the line box (`NATIVE_ALIGN_TOLERANCE_PX`) to tell left, right or centered native alignment.
- **Font**: styles are re-copied from the native caption on every layout pass (`applyOverlayFont`); a line wider than the video minus side padding (`OVERLAY_SIDE_PADDING_RATIO`, `OVERLAY_MIN_SIDE_PADDING_PX`) gets its font size scaled down to fit.
- **Horizontal**: each overlay follows the native alignment (left edge, right edge, or text center), then is clamped inside the video. Left anchoring matters for YouTube auto-generated captions, whose native text grows word by word before the overlay text is updated.
- **Vertical**: the group bottom is `min(native bottom, video bottom - reserved controls height)`. With `PLATFORM.snapToBottomBand` (YouTube), a group whose native bottom is in the lower part of the video (`BOTTOM_BAND_RATIO`) is pinned exactly to that baseline, so it does not depend on whether the controls were visible. `getControlsReservedHeight` uses the tallest measured controls element (ignored when taller than `MAX_CONTROLS_RESERVED_RATIO` of the video), else `controlsReservedHeightRatio`, else `FALLBACK_CONTROLS_HEIGHT`, plus `controlsGapRatio`, capped at `MAX_CONTROLS_RESERVED_RATIO`. Lines are stacked bottom-up from their own heights; natively adjacent lines (gap <= `LINE_ADJACENT_GAP_PX`) are packed tightly, others keep their native offset without overlapping.
- **Freeze**: while `isLayoutFrozen()` is true (hovered overlay, active selection or drag, popup open, translation pending), already placed overlays are never moved or restyled; only new (`nse-unplaced`) overlays are placed, and the rest is applied after the interaction ends.
- **Unplaced overlays**: new overlays get the `nse-unplaced` class (`visibility: hidden`) until their first valid layout.
- **Triggers**: `reconcileLines` (always on Netflix; only on content changes or while settling with `repositionOnlyOnChange`), `repositionAllOverlays` (window resize, video `ResizeObserver`, fullscreen change), and the `checkOverlayLayout` watcher (every `LAYOUT_CHECK_INTERVAL_MS`, started in `startExtension` and cleared in `stopExtension`), which re-lays out when the layout key (frame rect plus fullscreen state) changes, a layout is pending, during the `LAYOUT_SETTLE_MS` window after a layout change, or when `hasNativeGeometryChanged` detects that a placed line's native signature (font size, alignment and the horizontal anchor for that alignment, stored as `line.nativeSignature`) differs, because players re-lay out their own captions with a variable delay. The signature deliberately ignores vertical position, so the native caption shift when the controls appear never moves the overlay. `reconcileLines` also re-lays out on a native signature change.

## Settings

Stored in `chrome.storage.sync` and defined in `settings.js` (`NSE_SETTINGS_DEFAULTS`). Ten settings in three groups.

Three master toggles, default `true`, shown in the popup above the advanced options (not inside the "advanced options" panel):

- `netflixEnabled`: enables/disables the whole extension on Netflix.
- `youtubeEnabled`: enables/disables the whole extension on YouTube.
- `primeVideoEnabled`: enables/disables the whole extension on Prime Video.

When the current platform's master toggle is off, the content script tears down (disconnects observers, removes overlays/onboarding, ignores the back-arrow key) and the page shows its native subtitles. Wired in `content.js` via `isCurrentPlatformEnabled` / `startExtension` / `stopExtension` / `applyEnabledState`, applied live through `chrome.storage.onChanged`.

Five behavior toggles, all default `true` (matches the original always-on behavior):

- `jumpToPreviousSubtitleOnBack`: ArrowLeft jumps to the previous subtitle instead of the player's native rewind. The override only applies when `getPreviousCue` in `cues.js` returns a valid target: an earlier recorded cue that belongs to the current media (`getCueMediaKey`: `location.pathname` plus the video's `currentSrc`), starts before the current time, and was last on screen at most `CUE_HISTORY_MAX_AGE_SEC` (30 s of playback) ago; captions must also be on when the platform exposes that state (optional `PLATFORM.areCaptionsEnabled` hook, implemented on YouTube via the `aria-pressed` state of `.ytp-subtitles-button`, on Netflix via `netflix-bridge.js`, and on Prime Video via the `atvwebplayersdk_html5_previous_captions` `localStorage` key; an unknown state never blocks the jump). Otherwise ArrowLeft falls back to the player's native rewind. The history is kept short and consistent: stale entries are pruned on each new cue (`pruneStaleCues`), entries later than a newly recorded cue are dropped, it is reset when the media key changes, and any seek larger than `USER_SEEK_MIN_SEC` not caused by the back-jump itself (`onVideoSeeking` in `cues.js`, attached with `timeupdate` in `attachVideoListeners`; own seeks are ignored for `CUE_JUMP_SEEK_GRACE_MS`) resets the history and cancels any scheduled end-of-line pause. All history resets go through `resetCueHistory`. After the jump, the line replays and `schedulePauseBeforeTime` auto-pauses at the cue end; if the user pauses during the replay (`onVideoPause` in `overlay.js`), the scheduled pause is cancelled via `clearPauseSchedule`, so resuming does not trigger a stray pause at the line end. An interaction pause (hovering a subtitle with `autoPauseOnHover`, which sets `extensionPaused` before pausing) cancels the schedule immediately, since it is a deliberate extension-driven pause. An explicit player pause (`extensionPaused` false) is harder to tell apart from the transient `pause`/`play` events some players (e.g. Prime Video's SDK) emit while re-buffering after the back-jump seek, so for that case the cancel is deferred by `PAUSE_CONFIRM_USER_MS` and only applied if the video is still paused then (checked via `isPauseScheduled` in `cues.js`); a momentary pause that resumes on its own keeps the schedule so the line still stops at its end.
- `autoPauseOnHover`: hovering a subtitle pauses the video.
- `subtitleBlurEnabled`: subtitles are blurred by default.
- `autoRemoveBlurOnPause`: pausing reveals all blurred subtitles.
- `pronunciationEnabled` (popup label "Auto-pronounce on selection"): controls only whether the selected word/phrase is pronounced (Google Translate TTS) *automatically* when the popup opens. The speaker button in the popup is rendered independently of this flag whenever the source language is pronounceable (`isPronounceableLang`), so the user can always replay on demand; the flag only gates the auto-play call. Pronounced in the detected subtitle (source) language; `background.js` returns that language as `sourceLang` on the translate response and serves the audio via the `tts` message and `fetchTts` (host permission `translate.google.com`). Played in `interaction.js` via `playPronunciation` / `currentTtsAudio`.

Two language selects (codes from `NSE_LANGUAGES`):

- `subtitleSourceLang`: source language of the subtitles, default `"auto"` (detected from the active player caption track).
- `translationTargetLang`: language translations and definitions are shown in, default `"en"`.

A separate `onboardingCompleted` flag (default `false`) gates the first-run onboarding overlay.

Live updates flow through `chrome.storage.onChanged`, no page reload needed.

## Color tokens

- Blue accent: `#38bdf8` (same blue used for selected words and translations in `content.css`).
- Background: black / near-black (`#0a0a0a` or `rgba(20,20,20,0.95)`).
- Text: white (`#fff`), secondary text light gray (`#aaa`/`#ccc`).

## Versioning rule (mandatory)

Every change to this project must bump `manifest.json`'s `"version"` field intelligently using semver, and add a matching entry to `CHANGELOG.md`:

- **PATCH** (`x.y.Z`): bug fix, no behavior change for users.
- **MINOR** (`x.Y.0`): new feature or non-breaking enhancement.
- **MAJOR** (`X.0.0`): breaking change (removed/renamed setting, changed default behavior, manifest permission removal, etc).

Do not skip this even for small edits. Decide the bump based on the actual nature of the change, not just "always patch."

## Documentation rule (mandatory)

The documentation must always be kept up to date. Whenever a change affects the
file layout, the list of scripts and their load order, the settings, the
permissions, or any user-facing behavior, update the relevant docs in the same
change:

- This `CLAUDE.md` (especially the **File layout** and **Settings** sections).
- `README.md` (the **File structure**, **Features**, and **Settings** sections).

Treat stale documentation as a bug. Do not leave structural or behavioral changes
undocumented.
