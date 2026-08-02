// lib/pagerender.js
// Rendu HTML des pages bio publiques. Utilisé par la route /[slug] (Response
// HTML) et par l'éditeur du dashboard (iframe srcDoc) : un seul moteur de
// rendu, l'aperçu est donc toujours fidèle au rendu public.

export const PRESETS = {
  midnight: {
    name: "Midnight",
    bg1: "#0b1120", bg2: "#152a4d", text: "#e8edf7", muted: "#8b98b8",
    accent: "#3987e5", btnFill: "solid", btnShape: "rounded",
  },
  sunset: {
    name: "Sunset",
    bg1: "#241033", bg2: "#7c2d3e", text: "#fff2ea", muted: "#d8a8a0",
    accent: "#ff7a59", btnFill: "solid", btnShape: "pill",
  },
  ocean: {
    name: "Ocean",
    bg1: "#04293a", bg2: "#0a5e73", text: "#e6f7f5", muted: "#8fc2c9",
    accent: "#2dd4bf", btnFill: "glass", btnShape: "pill",
  },
  forest: {
    name: "Forest",
    bg1: "#0e1f16", bg2: "#1e4230", text: "#eaf6ee", muted: "#94b8a3",
    accent: "#45c486", btnFill: "outline", btnShape: "rounded",
  },
  cloud: {
    name: "Cloud",
    bg1: "#f5f7fc", bg2: "#dde7f7", text: "#17203a", muted: "#5a688c",
    accent: "#2a78d6", btnFill: "solid", btnShape: "rounded",
  },
  noir: {
    name: "Noir",
    bg1: "#09090b", bg2: "#1b1b21", text: "#f4f4f5", muted: "#8f8f98",
    accent: "#f4f4f5", btnFill: "outline", btnShape: "square",
  },
};

export const DEFAULT_THEME = { preset: "midnight" };

// Thème effectif = preset + overrides utilisateur.
export function resolveTheme(theme = {}) {
  const preset = PRESETS[theme.preset] ? theme.preset : "midnight";
  return { preset, ...PRESETS[preset], ...pick(theme, [
    "bg1", "bg2", "accent", "btnFill", "btnShape",
  ]) };
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== "") out[k] = obj[k];
  return out;
}

// Couleur de texte lisible sur un fond donné (luminance simple).
function contrastText(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#101322" : "#ffffff";
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const SHAPES = { pill: "999px", rounded: "14px", square: "4px" };

function buttonCss(t) {
  const radius = SHAPES[t.btnShape] || SHAPES.rounded;
  if (t.btnFill === "outline") {
    return `background:transparent;color:${t.text};border:2px solid ${t.accent};border-radius:${radius};`;
  }
  if (t.btnFill === "glass") {
    return `background:rgba(255,255,255,0.10);color:${t.text};border:1px solid rgba(255,255,255,0.22);border-radius:${radius};backdrop-filter:blur(8px);`;
  }
  return `background:${t.accent};color:${contrastText(t.accent)};border:none;border-radius:${radius};`;
}

function avatarHtml(page, t) {
  const a = String(page.avatar || "").trim();
  if (/^https?:\/\//i.test(a)) {
    return `<img class="avatar" src="${esc(a)}" alt="">`;
  }
  const content = a || (page.title || "?").trim()[0] || "?";
  return `<div class="avatar avatar-text">${esc(content)}</div>`;
}

export function renderPageHTML(page, buttons, { preview = false } = {}) {
  const t = resolveTheme(page.theme);
  const btns = (buttons || [])
    .map((b) => {
      const href = preview ? "#" : `/b/${b.id}`;
      return `<a class="btn" href="${href}"${preview ? ' tabindex="-1"' : ""}>${esc(b.label)}</a>`;
    })
    .join("\n      ");

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)} — AllMySocials</title>
<meta name="description" content="${esc(page.tagline || page.title)}">
<style>
*{box-sizing:border-box;margin:0}
body{
  min-height:100dvh;
  background:linear-gradient(160deg,${t.bg1},${t.bg2});
  color:${t.text};
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  -webkit-font-smoothing:antialiased;
  display:flex;flex-direction:column;align-items:center;
  padding:56px 20px 32px;
}
.wrap{width:100%;max-width:460px;display:flex;flex-direction:column;align-items:center;flex:1}
.avatar{
  width:96px;height:96px;border-radius:50%;object-fit:cover;
  box-shadow:0 8px 32px rgba(0,0,0,0.35);margin-bottom:18px;
}
.avatar-text{
  background:${t.accent};color:${contrastText(t.accent)};
  display:flex;align-items:center;justify-content:center;
  font-size:2.4rem;font-weight:700;
}
h1{font-size:1.45rem;letter-spacing:-0.01em;text-align:center}
.tagline{color:${t.muted};font-size:0.95rem;margin-top:6px;text-align:center;max-width:40ch}
.btns{width:100%;display:flex;flex-direction:column;gap:14px;margin-top:32px}
.btn{
  display:block;width:100%;padding:16px 20px;text-align:center;
  font-weight:600;font-size:0.98rem;text-decoration:none;
  ${buttonCss(t)}
  transition:transform .12s ease,filter .12s ease;
  ${preview ? "pointer-events:none;" : ""}
}
.btn:hover{filter:brightness(1.1)}
.btn:active{transform:scale(0.98)}
.empty{color:${t.muted};margin-top:32px;font-size:0.9rem}
.foot{margin-top:48px;padding-top:16px}
.foot a{color:${t.muted};font-size:0.75rem;text-decoration:none;letter-spacing:0.04em}
@media (prefers-reduced-motion:reduce){.btn{transition:none}}
</style>
</head><body>
  <main class="wrap">
    ${avatarHtml(page, t)}
    <h1>${esc(page.title)}</h1>
    ${page.tagline ? `<p class="tagline">${esc(page.tagline)}</p>` : ""}
    <nav class="btns">
      ${btns || ""}
    </nav>
    ${!btns ? '<p class="empty">No buttons yet.</p>' : ""}
  </main>
  <footer class="foot"><a href="/">⛓ AllMySocials</a></footer>
</body></html>`;
}
