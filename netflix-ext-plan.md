# Netflix Subtitle Blur & Translate - Implementation Plan

## Context

Obiettivo: studiare l'inglese guardando Netflix. L'estensione blurra i sottotitoli inglesi
per costringere all'ascolto; al passaggio del mouse (hover) il sottotitolo si rivela e il
video va in pausa; uscendo dall'hover si ri-blurra e riprende; cliccando una parola compare
un popup con traduzione italiana e voci di dizionario.

### Verifiche di fattibilita

- **Sottotitoli estraibili via DOM**: Netflix renderizza i sottotitoli testuali come DOM
  (`div.player-timedtext` > `div.player-timedtext-text-container` > uno `<span>` per riga),
  non come immagini. Overlay, blur e hover sono quindi possibili. Il video e DRM (Widevine/EME)
  ma non va toccato: si lavora solo sul layer DOM dei sottotitoli.
- **Background service worker obbligatorio**: in MV3 i content script sono soggetti alla
  same-origin policy di netflix.com. Una `fetch` verso `translate.googleapis.com` (che non
  manda header CORS) viene bloccata dal content script. Le `host_permissions` concedono il
  bypass CORS solo al service worker. Serve quindi un `background.js` che fa da proxy:
  content script -> `chrome.runtime.sendMessage` -> background fetch -> risposta.

### Decisioni

- Lingue fisse: sorgente `en`, destinazione `it`. Nessuna pagina opzioni, niente storage.
- Auto-pausa del video su interazione (hover rivela e mette in pausa; popup mantiene la pausa).
- Backend traduzione: endpoint Google gtx non ufficiale (`translate_a/single`, `dt=t` + `dt=bd`).
  Gratis, niente API key. Rischio noto: non documentato, puo cambiare o rispondere 429; gestire
  il fallimento con messaggio nel popup.

---

## File structure

```
netflix-sub-ext/
├── manifest.json
├── content.js
├── content.css
└── background.js
```

---

## manifest.json (MV3)

```json
{
  "manifest_version": 3,
  "name": "Netflix Subtitle Blur & Translate",
  "version": "0.1.0",
  "content_scripts": [{
    "matches": ["https://www.netflix.com/*"],
    "js": ["content.js"],
    "css": ["content.css"],
    "run_at": "document_idle"
  }],
  "background": { "service_worker": "background.js" },
  "host_permissions": ["https://translate.googleapis.com/*"]
}
```

Nessun `permissions` extra: niente storage/tabs.

---

## background.js - proxy traduzione

Unica responsabilita: ricevere una parola dal content script, chiamare l'endpoint Google,
restituire `{ word, translation, entries }`. La `fetch` qui funziona grazie a `host_permissions`.

```js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "translate") return;
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
  const data = await res.json();
  return {
    word,
    translation: data[0]?.[0]?.[0] ?? null,
    entries: data[1] ?? null
  };
}
```

`data[1]` = array di `[partOfSpeech, [definizioni...]]` (puo essere null per parole rare).

---

## content.js - architettura

### 1. Rilevamento sottotitoli

Il player carica in modo asincrono: a `document_idle` il container non esiste ancora.

```
osserva document.body (childList + subtree)
  -> attendi comparsa di .player-timedtext
  -> sposta l'observer su .player-timedtext (childList + subtree + characterData)
     -> a ogni mutation: processSubtitle()
disconnetti l'observer su body una volta trovato il player
```

Resilienza selettore (Netflix rinomina le classi dopo i deploy): catena di fallback
`.player-timedtext` -> `[class*="timedtext"]` -> rilevamento strutturale (div in posizione
assoluta con testo dentro il container video). E la principale superficie di manutenzione.

Sottotitoli a immagine (SVG/IMG dentro il container): rilevare e uscire senza toccarli.

### 2. processSubtitle()

```
leggi testo dal nodo sottotitolo
se testo === ultimo testo visto -> return (deduplica)
salva ultimo testo

nascondi nodo originale (visibility: hidden, NON display:none, per mantenere il layout)
inietta overlay (#nse-overlay) posizionato sopra il nodo originale
tokenizza il testo -> span per parola
```

Token parola: `<span class="nse-word" data-word="understand">understand</span>`.
Punteggiatura/spazi = text node inerti, non wrappati.

L'overlay replica gli stili del sottotitolo Netflix copiando i computed styles
(`font-family`, `font-size`, `color`, `text-shadow`) dal nodo originale.

### 3. Blur + hover + auto-pausa

CSS:
```css
#nse-overlay { filter: blur(6px); transition: filter .15s ease; pointer-events: all; }
#nse-overlay.revealed { filter: none; }
```
Overlay sopra il layer Netflix: `z-index: 2147483647`.

JS (gestione pausa tramite l'elemento `<video>` della pagina):
```js
const video = () => document.querySelector("video");

overlay.addEventListener("mouseenter", () => {
  overlay.classList.add("revealed");
  video()?.pause();
});
overlay.addEventListener("mouseleave", () => {
  if (document.getElementById("nse-popup")) return; // popup aperto: resta in pausa
  overlay.classList.remove("revealed");
  video()?.play();
});
```

### 4. Click parola -> traduzione (via background)

```js
overlay.addEventListener("click", async (e) => {
  const span = e.target.closest(".nse-word");
  if (!span) return;
  e.stopPropagation();
  video()?.pause();

  const word = span.dataset.word.replace(/[^a-zA-Z'-]/g, "");
  if (!word) return;

  const result = await chrome.runtime.sendMessage({ type: "translate", word });
  showPopup(span, result);
});
```

### 5. Popup

`removePopup()` prima di creare; costruzione con `word`, divisore, `translation`, voci dizionario
opzionali piu piccole sotto. `positionPopup()` ancora allo span: prova sopra, se sfora flippa
sotto, clamp orizzontale ai bordi. Chiusura: click fuori (`once`) + tasto Escape. Alla chiusura
del popup -> ri-blurra overlay e `video()?.play()`.

In caso di `result.error`: mostrare nel popup un messaggio di fallback (traduzione non disponibile).

---

## Edge cases

| Caso | Gestione |
|---|---|
| Netflix rinomina le classi | catena selettori: classe specifica -> `[class*="timedtext"]` -> strutturale |
| Sottotitoli a immagine | container con `<svg>`/`<img>` -> skip |
| Sottotitolo multi-riga | ogni riga e un nodo separato -> processa indipendentemente |
| Sottotitolo sparisce | observer rileva rimozione -> rimuovi overlay + chiudi popup + `play()` |
| Popup vicino al bordo | `positionPopup()` flippa sopra/sotto e clampa |
| Netflix intercetta il click | `e.stopPropagation()` sullo span |
| API translate fallisce / 429 | background ritorna `{error:true}` -> popup di fallback |
| Parola con apostrofo ("don't") | inviare token intero, Google lo gestisce |
| Pausa "appiccicosa" | mouseleave NON riprende se popup aperto; riprende solo alla chiusura popup |

---

## Build order

1. `manifest.json` + content.js vuoto + `background.js` vuoto: verifica iniezione su Netflix.
2. MutationObserver a due livelli: logga in console il testo del sottotitolo a ogni cambio.
3. Overlay + span parola: verifica che il posizionamento combaci con il sottotitolo originale.
4. Blur + toggle hover + auto-pausa: verifica nessuna interferenza coi controlli Netflix.
5. `chrome.runtime.sendMessage` -> `background.translate()`: logga il risultato in console.
6. Rendering popup + posizionamento.
7. Chiusura popup (click fuori, Escape) + ripresa video.
8. Rifinitura: edge case, CSS, resilienza selettore.

---

## Verifica end-to-end

- Caricare l'estensione: `chrome://extensions` -> Developer mode -> Load unpacked -> cartella `netflix-sub-ext`.
- Aprire un titolo Netflix con sottotitoli inglesi attivi.
- **(Opzionale, consigliato) Conferma DOM live**: nella console della pagina Netflix, con
  sottotitolo a video, eseguire:
  ```js
  document.querySelector(".player-timedtext")?.outerHTML
  ```
  per confermare le classi correnti (Netflix le cambia nel tempo) prima di scrivere il selettore.
- Verifiche manuali: sottotitolo blurrato di default; hover -> rivela + pausa; uscita -> ri-blur + play;
  click parola -> popup con traduzione IT + dizionario; Escape/click-fuori chiude e riprende.
- Verificare nella console del service worker (link "service worker" nella pagina estensioni) che
  la fetch a `translate.googleapis.com` vada a buon fine (no errori CORS).
