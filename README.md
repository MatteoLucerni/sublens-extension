<p align="center">
  <img src="icons/icon128.png" alt="Sublens Logo" width="80" />
</p>

<h1 align="center">Sublens</h1>

<p align="center">
  <strong>Blur subtitles until you want to read them, then click, Ctrl/Cmd+click or drag-select any word for instant translation, dictionary definitions and pronunciation on Netflix, YouTube and Prime Video.</strong>
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/hkocpinnlehjpbobobnpocanjaaaiijh"><img src="https://img.shields.io/chrome-web-store/v/hkocpinnlehjpbobobnpocanjaaaiijh?style=flat&logo=googlechrome&logoColor=white&label=Chrome%20Web%20Store" alt="Chrome Web Store Version" /></a>
  <a href="https://chromewebstore.google.com/detail/hkocpinnlehjpbobobnpocanjaaaiijh"><img src="https://img.shields.io/chrome-web-store/users/hkocpinnlehjpbobobnpocanjaaaiijh?style=flat&logo=googlechrome&logoColor=white&label=Users" alt="Chrome Web Store Users" /></a>
  <a href="https://chromewebstore.google.com/detail/hkocpinnlehjpbobobnpocanjaaaiijh"><img src="https://img.shields.io/chrome-web-store/rating/hkocpinnlehjpbobobnpocanjaaaiijh?style=flat&logo=googlechrome&logoColor=white&label=Rating" alt="Chrome Web Store Rating" /></a>
  <img src="https://img.shields.io/badge/manifest-v3-green?style=flat" alt="Manifest V3" />
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/hkocpinnlehjpbobobnpocanjaaaiijh">Chrome Web Store</a> &middot;
  <a href="https://getsublens.com/">Website</a> &middot;
  <a href="https://forms.gle/DK6xH1bjRLuqNHYQ6">Give Feedback</a> &middot;
  <a href="CHANGELOG.md">Changelog</a>
</p>

---

## Features

### Subtitle Blur

Subtitles can be blurred so you test your listening before reading. Blur is off by default; turn it on in the popup. When enabled, hover over a line to reveal it; pausing the video reveals every blurred line at once. The blur amount scales with the subtitle's own font size. Toggle the blur, and whether pausing auto-reveals, independently in the popup.

### Click to Translate & Define

**Click** any subtitle word for its translation and dictionary entry. **Ctrl/Cmd+click** additional words to combine them into one selection before looking them up, or **click and drag** across a line to select a whole phrase. The popup appears instantly with a loading spinner, then fills in with the translation, dictionary entries and example sentences, placed above or below the subtitles depending on which side has room.

### Pronunciation

The selected word or phrase can be pronounced in the subtitle's source language, fetched through Google Translate's text-to-speech endpoint. A speaker button in the popup is always available to play the pronunciation on demand. The **Auto-pronounce on selection** toggle in the popup controls only whether the pronunciation also plays automatically as soon as the translation popup opens.

### Auto-Pause on Hover

Hovering a subtitle pauses the video so you have time to read or look up a word, and resumes playback when you move the mouse away. Toggleable independently of the blur and reveal-on-pause behaviors.

### Replay the Previous Subtitle

Press the **Left Arrow** key to jump back to the start of the previous subtitle line and pause at its end, instead of the player's default rewind. The jump only happens when the previous subtitle disappeared less than 30 seconds of playback ago; otherwise (subtitles off, nothing played yet, after a manual seek, or after switching video/episode) the key falls back to the player's native rewind, so it never sends you to a stale subtitle. On YouTube, Netflix and Prime Video the extension also reads the player's captions state directly, so the jump is disabled as soon as captions are turned off. If you manually pause during the replay, the scheduled auto-pause at the end of the line is cancelled.

### Stable Overlay Positioning

Overlays are centered on the real text of the native captions, kept inside the video (long lines shrink to fit), stacked without overlaps, and re-laid out automatically after fullscreen, window resize or YouTube theater mode. While you hover a subtitle, select words or read the translation popup, the overlay never moves under your cursor.

### Language Selection

The subtitle (source) language is auto-detected from the active caption track on Netflix or YouTube, including auto-translated YouTube tracks (e.g. "English >> Italian" is detected as Italian, the language actually shown), or you can set it manually. On Prime Video, whose player exposes no caption-track language, the source language is detected by Google Translate (the "Auto" default). Pick the language translations and dictionary definitions are shown in from a curated list of 14 Latin/Cyrillic languages. Both apply live, no page reload.

### Per-Platform Enable/Disable

Independent **Enable on Netflix** / **Enable on YouTube** / **Enable on Prime Video** master toggles in the popup. When a platform is disabled, its page plays with normal native subtitles and Sublens does nothing on it; turn them all off to disable the extension everywhere.

### Netflix, YouTube & Prime Video Support

Built around a platform adapter (`platforms.js`) that isolates every platform-specific detail, so the same overlay, blur, translation and navigation logic runs on all three sites. On YouTube, both manual and auto-generated (rollup) captions are supported on `youtube.com/watch` pages; the `>>` speaker-change markers YouTube adds are stripped before words become clickable, the overlay gets a semi-transparent background so white captions stay readable over bright scenes, and the overlay stays pinned to a stable baseline above the player controls whether they are shown or hidden. On Prime Video (`primevideo.com`), captions are read from the player's `.atvwebplayersdk-captions-text` lines and the extension drives the largest of the player's several `<video>` elements; titles that use image-based (bitmap) subtitles fall back to native rendering.

### Toolbar Settings Popup

Click the toolbar icon to open the settings popup: the language selects, the platform toggles, and five behavior toggles tucked under "Show advanced options" to keep the default view simple. Every control has a "?" tooltip explaining its effect. A footer links out to **Give Feedback**, the **Changelog**, and the **Website**, and shows the installed version.

### Support the Project

A **Support** button in the popup header (and in the website's navigation bar and footers) opens a dialog with three ways to help: buy a coffee on [Ko-fi](https://ko-fi.com/D5Y424F3EB), contribute on [GitHub](https://github.com/MatteoLucerni/netflix-subtitles-translate), or [leave a review](https://chromewebstore.google.com/detail/hkocpinnlehjpbobobnpocanjaaaiijh/reviews) on the Chrome Web Store.

### Onboarding & Getting Started

The first time you land on Netflix after installing, a centered overlay asks you to pick your translation language. On install, a getting-started page opens in a new tab walking through every feature.

### Privacy by Design

No account, no sign-in, no analytics, no tracking. The only data sent anywhere is the word or phrase you actively select, sent to Google Translate solely to return its translation and pronunciation. See the [Privacy Policy](https://getsublens.com/privacy.html) for details.

---

## Installation

### For Users

Install directly from the **[Chrome Web Store](https://chromewebstore.google.com/detail/hkocpinnlehjpbobobnpocanjaaaiijh)**.

### For Developers

1. Clone the repository
   ```bash
   git clone https://github.com/MatteoLucerni/netflix-subtitles-translate.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (top-right corner)
4. Click **Load unpacked** and select the repository's root folder
5. Open a Netflix video, a YouTube `/watch` video with captions turned on (CC button), or a Prime Video title with subtitles on

> **Tip:** To filter only this extension's logs in Chrome DevTools console, use:
> `url:chrome-extension://EXTENSION_ID`
> Logs are also gated behind `self.DEV_MODE` in `env.js`, so they only appear in development builds (see [Logging](#logging) below).

---

## Build

Package the extension for Chrome Web Store upload:

```powershell
.\build.ps1
```

This reads `manifest.json`, collects exactly the files the extension references (manifest, content scripts, `content.css`, `background.js`, the popup and its assets, `env.js`, icons), forces `env.js` to `self.DEV_MODE = false`, and writes a versioned zip to `dist/Sublens-<version>-<timestamp>.zip`.

---

## Project Structure

```
subtitles-translate-extension
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── docs/                  Marketing site (landing, welcome, privacy), published on getsublens.com
│   ├── index.html         Landing page
│   ├── welcome.html       Getting-started page opened on install
│   ├── privacy.html       Privacy policy
│   ├── 404.html
│   └── assets/
│       ├── css/site.css            Single stylesheet for the whole site (dark theme tokens + components)
│       └── js/
│           ├── config.js           All external links, defined once
│           ├── layout.js           Shared navigation bar and footer, fills data-link hrefs
│           ├── support-modal.js    Support dialog (Ko-fi, GitHub, Web Store review)
│           └── feedback-widget.js  Floating feedback/bug-report widget
├── env.js                 Sets self.DEV_MODE (logging flag); loaded first
├── settings.js            Shared chrome.storage.sync helpers + language list
├── platforms.js           Platform adapter (Netflix/YouTube/Prime Video): selectors, seek, language detection
├── core.js                Config constants, shared state, base helpers
├── overlay.js             Subtitle overlay: styles, positioning, tokenizing, reconcile, blur/reveal
├── cues.js                Cue history + Left Arrow back-jump navigation
├── interaction.js         Word/phrase selection (click/Ctrl+Cmd+click/drag) + translation popup
├── content.js             Entry point: subtitle discovery, onboarding, init + event wiring
├── netflix-bridge.js      Netflix-only MAIN-world script: reports whether captions are on to the content scripts
├── content.css            Styles for the subtitle overlay and dictionary popup
├── background.js          Service worker: platform-aware player seek + Google Translate requests
├── popup.html/css/js      Toolbar action popup with the settings controls and the support dialog
├── build.ps1              Packages the extension into a versioned zip for the Chrome Web Store
├── CHANGELOG.md           Version history
├── CLAUDE.md              Project instructions for Claude Code (architecture, conventions, versioning rules)
├── manifest.json          Extension manifest (MV3)
└── README.md
```

---

## How It Works

1. **Content scripts** (`env.js` through `content.js`) load on Netflix, YouTube and Prime Video in the exact order declared in `manifest.json`, sharing one isolated-world scope. Only `content.js`, loaded last, runs top-level execution (settings loading, event wiring, `init()`); the other files are declarations only, so every symbol they reference already exists.
2. `platforms.js` detects the current platform from the page hostname and exposes a single `PLATFORM` object holding every platform-specific detail (selectors, debounce timing, caption cleanup, seek strategy), so `core.js`, `overlay.js`, `cues.js`, `interaction.js` and `content.js` stay platform-agnostic.
3. A **MutationObserver** watches the subtitle/caption container and a lightweight container watchdog re-attaches it whenever the player replaces it (Netflix mounts a placeholder before playback; YouTube re-renders on SPA navigation; Prime Video captions live inside the stable `.atvwebplayersdk-player-container`).
4. **Settings** are stored in `chrome.storage.sync` and applied live via `chrome.storage.onChanged`, no page reload required.
5. The **background service worker** injects a small MAIN-world script via `chrome.scripting.executeScript` to call each platform's internal player API (Netflix seek and source-language detection; YouTube source-language detection; Prime Video seeks directly on the `<video>` and resolves to Google auto-detect), and proxies translation/pronunciation requests to Google Translate.

### Logging

All logging is gated behind a single flag defined in `env.js` (`self.DEV_MODE`), shared by the content scripts and the background service worker (which loads it via `importScripts("env.js")`). In development the flag is `true` and `[NSE]`-prefixed logs are printed. The production zip produced by `build.ps1` rewrites `env.js` to `self.DEV_MODE = false`, so a packaged build prints nothing to the user's console.

## Permissions

- `scripting`: used to inject a script into the page's main world to call the internal player API (Netflix seek and source-language detection, YouTube source-language detection).
- `storage`: used by `chrome.storage.sync` to persist the settings.
- Content scripts run on `netflix.com`, `youtube.com` and `primevideo.com` (declared under `content_scripts.matches`; Prime Video needs no host permission because the background never injects into it).
- `host_permissions` for `netflix.com` and `youtube.com` (MAIN-world player API access), `translate.googleapis.com` (background fetches for translation/dictionary data), and `translate.google.com` (background fetches for text-to-speech audio).

## Versioning

This project follows [Semantic Versioning](https://semver.org/). Every change bumps `manifest.json`'s `version` field and is recorded in [CHANGELOG.md](CHANGELOG.md).

---

## License

This project is licensed under the [MIT License](LICENSE).

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.
