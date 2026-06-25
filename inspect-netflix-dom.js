(() => {
  const byClass = document.querySelector(".player-timedtext");
  const byPartialClass = document.querySelector('[class*="timedtext"]');
  const video = document.querySelector("video");

  console.log("=== .player-timedtext ===");
  console.log(byClass);
  console.log(byClass?.outerHTML);

  console.log("=== [class*=timedtext] ===");
  console.log(byPartialClass);
  console.log(byPartialClass?.outerHTML);

  console.log("=== video element ===");
  console.log(video);
  console.log("video rect:", video?.getBoundingClientRect());

  console.log("=== all elements containing 'timedtext' in class ===");
  document.querySelectorAll('[class*="timedtext"]').forEach((el) => {
    console.log(el.className, "->", el);
  });
})();
