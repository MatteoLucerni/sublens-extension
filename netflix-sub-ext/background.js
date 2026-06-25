chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "translate") return;
  if (typeof msg.word !== "string" || !msg.word.trim()) {
    sendResponse({ error: true });
    return;
  }
  translate(msg.word).then(sendResponse).catch(() => sendResponse({ error: true }));
  return true;
});

async function translate(word) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "en");
  url.searchParams.set("tl", "it");
  url.searchParams.set("dt", "t");
  url.searchParams.append("dt", "bd");
  url.searchParams.set("q", word);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`translate request failed: ${res.status}`);

  const data = await res.json();
  return {
    word,
    translation: data[0]?.[0]?.[0] ?? null,
    entries: data[1] ?? null
  };
}
