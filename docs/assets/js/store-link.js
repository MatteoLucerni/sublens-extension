(function () {
  // TODO: replace PLACEHOLDER_ID with the real Chrome Web Store item id
  // (https://chromewebstore.google.com/detail/<id>) immediately after the
  // extension is first published. Until then every "Add to Chrome" button is dead.
  var STORE_URL = "https://chromewebstore.google.com/detail/PLACEHOLDER_ID";

  function apply() {
    var links = document.querySelectorAll("[data-store-link]");
    for (var i = 0; i < links.length; i++) {
      links[i].setAttribute("href", STORE_URL);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();
