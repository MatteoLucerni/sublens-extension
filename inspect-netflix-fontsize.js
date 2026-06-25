(() => {
  document.querySelectorAll('[class*="timedtext"]').forEach((el) => {
    const cs = getComputedStyle(el);
    console.log(
      el.className,
      "fontSize=" + cs.fontSize,
      "el=",
      el,
      "text=" + JSON.stringify(el.textContent.slice(0, 40))
    );
  });
})();
