function getCueMediaKey(video) {
  return `${location.pathname}|${video.currentSrc}`;
}

function resetCueHistory() {
  cueHistory = [];
  cueIndex = -1;
  cueHistoryMediaKey = null;
}

function getCueLastSeenTime(entry) {
  return entry.endTime ?? entry.time;
}

function pruneStaleCues(now) {
  let stale = 0;
  while (stale < cueIndex && now - getCueLastSeenTime(cueHistory[stale]) > CUE_HISTORY_MAX_AGE_SEC) {
    stale++;
  }
  if (stale === 0) return;
  cueHistory.splice(0, stale);
  cueIndex -= stale;
  log("pruneStaleCues: dropped", stale, "stale cues");
}

function markCueEnded() {
  const video = getVideo();
  if (!video) return;
  const entry = cueHistory[cueIndex];
  if (!entry || entry.endTime != null) return;
  entry.endTime = video.currentTime;
  log("markCueEnded: endTime", entry.endTime, "for cue started at", entry.time);
}

function recordCueStart() {
  if (suppressHistoryCapture) {
    suppressHistoryCapture = false;
    clearTimeout(suppressHistoryCaptureTimer);
    log("recordCueStart: suppressed (consumed)");
    return;
  }
  const video = getVideo();
  if (!video) return;

  const mediaKey = getCueMediaKey(video);
  if (cueHistoryMediaKey !== mediaKey) {
    if (cueHistory.length > 0) log("recordCueStart: media changed, resetting history");
    resetCueHistory();
    cueHistoryMediaKey = mediaKey;
  }

  const time = video.currentTime;
  const knownIndex = cueHistory.findIndex(
    (entry) => Math.abs(entry.time - time) < CUE_HISTORY_EPSILON_SEC
  );
  if (knownIndex !== -1) {
    cueIndex = knownIndex;
    log("recordCueStart: replaying known cue", time, "cueIndex", cueIndex);
    return;
  }

  cueHistory = cueHistory.filter((entry) => entry.time < time);
  cueHistory.push({ time, endTime: null });
  cueIndex = cueHistory.length - 1;
  pruneStaleCues(time);
  log("recordCueStart: pushed", time, "cueIndex", cueIndex, "historyLength", cueHistory.length);
}

function onVideoTimeUpdate(e) {
  lastKnownVideoTime = e.target.currentTime;
}

function onVideoSeeking(e) {
  const video = e.target;
  const previousTime = lastKnownVideoTime;
  lastKnownVideoTime = video.currentTime;
  if (performance.now() < cueJumpSeekUntil) return;
  if (Math.abs(video.currentTime - previousTime) < USER_SEEK_MIN_SEC) return;
  log("onVideoSeeking: external seek from", previousTime, "to", video.currentTime, "resetting history");
  clearPauseSchedule();
  resetCueHistory();
}

function isPauseScheduled() {
  return pauseScheduleTimer !== null || pauseScheduleCleanup !== null;
}

function clearPauseSchedule() {
  if (pauseScheduleCleanup) {
    pauseScheduleCleanup();
    pauseScheduleCleanup = null;
  }
  clearTimeout(pauseScheduleTimer);
  pauseScheduleTimer = null;
}

function schedulePauseBeforeTime(endTime) {
  const video = getVideo();
  if (!video) return;
  clearPauseSchedule();
  const margin = PLATFORM.pauseBeforeCueSec ?? PAUSE_BEFORE_NEXT_CUE_SEC;

  let rafId = null;
  const check = () => {
    if (video.currentTime >= endTime - margin) {
      clearPauseSchedule();
      video.pause();
      log("schedulePauseBeforeTime: paused at end of previous cue", video.currentTime);
      return;
    }
    rafId = requestAnimationFrame(check);
  };
  rafId = requestAnimationFrame(check);
  pauseScheduleCleanup = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
  };

  pauseScheduleTimer = setTimeout(() => {
    clearPauseSchedule();
    video.pause();
    log("schedulePauseBeforeTime: safety timeout fallback pause");
  }, PAUSE_SCHEDULE_SAFETY_MS);
}

function getPreviousCue(video) {
  if (cueIndex <= 0) return null;
  if (cueHistoryMediaKey !== getCueMediaKey(video)) return null;
  if (PLATFORM.areCaptionsEnabled && !PLATFORM.areCaptionsEnabled()) return null;
  const target = cueHistory[cueIndex - 1];
  if (!target) return null;
  const now = video.currentTime;
  const lastSeen = getCueLastSeenTime(target);
  if (target.time >= now) return null;
  if (lastSeen > now + CUE_HISTORY_EPSILON_SEC) return null;
  if (now - lastSeen > CUE_HISTORY_MAX_AGE_SEC) return null;
  return target;
}

function hasPreviousCue() {
  const video = getVideo();
  return !!video && getPreviousCue(video) !== null;
}

async function jumpToPreviousCue() {
  log("jumpToPreviousCue: called, cueIndex", cueIndex, "historyLength", cueHistory.length);
  const video = getVideo();
  if (!video) {
    log("jumpToPreviousCue: no video element found, aborting");
    return;
  }
  const target = getPreviousCue(video);
  if (!target) {
    log("jumpToPreviousCue: no valid earlier cue available, aborting");
    return;
  }

  cueIndex -= 1;
  log("jumpToPreviousCue: target", target, "new cueIndex", cueIndex);

  cancelSelection();
  removePopup();

  suppressHistoryCapture = true;
  clearTimeout(suppressHistoryCaptureTimer);
  suppressHistoryCaptureTimer = setTimeout(() => { suppressHistoryCapture = false; }, 2000);

  cueJumpSeekUntil = performance.now() + CUE_JUMP_SEEK_GRACE_MS;
  const timeMs = Math.max(0, Math.round(target.time * 1000));
  const seeked = await seekPlayer(timeMs);
  if (!seeked) {
    log("jumpToPreviousCue: falling back to video.currentTime");
    cueJumpSeekUntil = performance.now() + CUE_JUMP_SEEK_GRACE_MS;
    video.currentTime = target.time;
  }

  video.play().catch((err) => log("jumpToPreviousCue: video.play() rejected", err));

  if (target.endTime != null) {
    schedulePauseBeforeTime(target.endTime);
  } else {
    video.pause();
  }
}
