document.addEventListener("nse-captions-query", () => {
  let state = "unknown";
  try {
    const videoPlayer = window.netflix?.appContext?.state?.playerApp?.getAPI?.()?.videoPlayer;
    const sessionId = videoPlayer?.getAllPlayerSessionIds?.()?.[0];
    const player = sessionId !== undefined ? videoPlayer.getVideoPlayerBySessionId(sessionId) : null;
    const track = player?.getTimedTextTrack?.();
    if (track) state = track.isNoneTrack || track.isForcedNarrative ? "off" : "on";
  } catch (err) {
    state = "unknown";
  }
  document.documentElement.setAttribute("data-nse-captions", state);
});
