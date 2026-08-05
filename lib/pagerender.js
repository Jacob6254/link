// lib/pagerender.js
// Rendu HTML des pages bio publiques. Utilisé par la route /[slug] (Response
// HTML) et par l'éditeur du dashboard (iframe srcDoc) : un seul moteur de
// rendu, l'aperçu est donc toujours fidèle au rendu public.
import { ESCAPE_FN, EXT_BROWSER_B64, IN_APP_RE, IS_IOS_JS } from "./escape.js";

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

export const FONTS = {
  default: { name: "System", css: `-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif`, gf: null },
  inter: { name: "Inter", css: `'Inter',sans-serif`, gf: "Inter:wght@400;600;700" },
  poppins: { name: "Poppins", css: `'Poppins',sans-serif`, gf: "Poppins:wght@400;600;700" },
  montserrat: { name: "Montserrat", css: `'Montserrat',sans-serif`, gf: "Montserrat:wght@400;600;700" },
  spacegrotesk: { name: "Space Grotesk", css: `'Space Grotesk',sans-serif`, gf: "Space+Grotesk:wght@400;600;700" },
  playfair: { name: "Playfair Display", css: `'Playfair Display',serif`, gf: "Playfair+Display:wght@500;700" },
  pacifico: { name: "Pacifico", css: `'Pacifico',cursive`, gf: "Pacifico" },
};

export const ANIMATIONS = {
  none: "None",
  bounce: "Bounce",
  pulse: "Pulse",
  wiggle: "Wiggle",
  glow: "Glow",
  float: "Float",
  shake: "Shake",
  heartbeat: "Heartbeat",
};

export const HEADER_STYLES = {
  classic: "Classic — avatar on the background",
  cover: "Cover — photo fills the top, name over it",
};

export const DEFAULT_THEME = { preset: "midnight" };

// Thème effectif = preset + overrides utilisateur.
export function resolveTheme(theme = {}) {
  const preset = PRESETS[theme.preset] ? theme.preset : "midnight";
  const t = { preset, ...PRESETS[preset], ...pick(theme, [
    "bg1", "bg2", "accent", "text", "btnFill", "btnShape",
  ]) };
  t.font = FONTS[theme.font] ? theme.font : "default";
  t.bgImage = typeof theme.bgImage === "string" ? theme.bgImage : "";
  t.bgBlur = clampInt(theme.bgBlur, 0, 30, 0);
  t.bgDim = clampInt(theme.bgDim, 0, 80, 30);
  t.titleBadge = !!theme.titleBadge;
  t.hideFooter = !!theme.hideFooter;
  t.avatarSize = clampInt(theme.avatarSize, 56, 200, 96);
  t.avatarShape = theme.avatarShape === "square" ? "square" : "circle";
  t.cover = typeof theme.cover === "string" ? theme.cover : "";
  t.coverHeight = clampInt(theme.coverHeight, 80, 320, 160);
  t.headerStyle = HEADER_STYLES[theme.headerStyle] ? theme.headerStyle : "classic";
  t.badgeColor = /^#[0-9a-fA-F]{6}$/.test(theme.badgeColor || "")
    ? theme.badgeColor
    : "#3b9eff";
  t.online = !!theme.online;
  t.onlineText = String(theme.onlineText || "Online").slice(0, 30);
  t.location = String(theme.location || "").slice(0, 40);
  t.avatarRing = !!theme.avatarRing;
  return t;
}

function clampInt(v, min, max, dflt) {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, Math.round(n)));
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

// URL sûre pour un contexte CSS url("...").
function cssUrl(u) {
  return String(u || "").replace(/["\\()]/g, "");
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

function coverHtml(t) {
  if (!t.cover || t.headerStyle === "cover") return "";
  return `<div class="cover" style="background-image:url('${cssUrl(t.cover)}')"></div>`;
}

// Pastilles sous le nom : statut en ligne et localisation.
function metaHtml(t) {
  const bits = [];
  if (t.online) {
    bits.push(
      `<span class="pill"><span class="pill-dot"></span>${esc(t.onlineText)}</span>`
    );
  }
  if (t.location) {
    bits.push(`<span class="pill"><span class="pill-pin">📍</span>${esc(t.location)}</span>`);
  }
  return bits.length ? `<div class="pills">${bits.join("")}</div>` : "";
}

function badgeHtml(t) {
  return t.titleBadge
    ? `<span class="vbadge" aria-label="Verified">
<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path fill="currentColor" d="M12 1.6l2.4 2.1 3.2-.3.9 3.1 2.8 1.6-1.3 2.9 1.3 2.9-2.8 1.6-.9 3.1-3.2-.3L12 20.4l-2.4-2.1-3.2.3-.9-3.1-2.8-1.6L4 11l-1.3-2.9 2.8-1.6.9-3.1 3.2.3z"/><path fill="#fff" d="M10.8 14.6l-2.6-2.6 1.1-1.1 1.5 1.5 3.9-3.9 1.1 1.1z"/></svg>
</span>`
    : "";
}

// En-tête "cover" : la photo occupe le haut, le nom est posé dessus.
function coverHeaderHtml(page, t) {
  const bg = t.cover
    ? `style="background-image:url('${cssUrl(t.cover)}')"`
    : `style="background:linear-gradient(160deg,${t.bg2},${t.bg1})"`;
  return `<header class="hero" ${bg}>
      <div class="hero-shade"></div>
      <div class="hero-body">
        <h1>${esc(page.title)}${badgeHtml(t)}</h1>
        ${metaHtml(t)}
      </div>
    </header>`;
}

function backgroundCss(t) {
  if (!t.bgImage) return "";
  return `
body::before{
  content:"";position:fixed;inset:-40px;z-index:-2;
  background:url("${cssUrl(t.bgImage)}") center/cover no-repeat;
  ${t.bgBlur ? `filter:blur(${t.bgBlur}px);` : ""}
}
body::after{
  content:"";position:fixed;inset:0;z-index:-1;
  background:rgba(0,0,0,${(t.bgDim / 100).toFixed(2)});
}`;
}

// Pastille d'icône posée sur un bouton (emoji ou petite image).
function iconHtml(icon) {
  const v = String(icon || "").trim();
  if (!v) return "";
  const inner = /^https?:\/\//i.test(v)
    ? `<img src="${esc(v)}" alt="">`
    : esc(v);
  return `<span class="btn-icon">${inner}</span>`;
}

function buttonHtml(b, { preview, visitId }) {
  // Un bloc "heading" n'est pas un lien : c'est un intertitre entre les boutons.
  if (b.kind === "heading") {
    return `<p class="btn-heading">${esc(b.label)}</p>`;
  }

  const href = preview ? "#" : `/b/${b.id}${visitId ? `?v=${encodeURIComponent(visitId)}` : ""}`;
  const anim = ANIMATIONS[b.animation] && b.animation !== "none" ? ` anim-${b.animation}` : "";
  const tab = preview ? ' tabindex="-1"' : "";
  const icon = iconHtml(b.icon);

  if (b.image) {
    return `<a class="btn btn-img${anim}" href="${href}"${tab}
  style="background-image:url('${cssUrl(b.image)}')">${icon}<span>${esc(b.label)}</span></a>`;
  }
  return `<a class="btn${anim}" href="${href}"${tab}>${icon}${esc(b.label)}</a>`;
}

// Sortie du navigateur intégré sur iOS, déclenchée DANS le handler du clic
// (le "user gesture" est indispensable). Le tap ouvre le navigateur du
// téléphone sur notre propre /b/<id>, qui fait ensuite le deep-link et le
// tracking depuis un vrai navigateur.
const ESCAPE_SCRIPT = `<script>
(function () {
  var ua = navigator.userAgent || "";
  var inApp = ${IN_APP_RE}.test(ua);
  if (!inApp) return;   // navigateur normal : on ne touche à rien

  ${ESCAPE_FN}

  var ext = atob("${EXT_BROWSER_B64}");

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a.btn") : null;
    if (!a) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) !== "/") return;

    e.preventDefault();
    amsEscape(location.protocol + "//" + location.host + href, { extBrowser: ext });
  }, true);
})();
</script>`;

export function renderPageHTML(page, buttons, { preview = false, visitId = null } = {}) {
  const t = resolveTheme(page.theme);
  const font = FONTS[t.font];
  const btns = (buttons || [])
    .map((b) => buttonHtml(b, { preview, visitId }))
    .join("\n      ");

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)} — AllMySocials</title>
<meta name="description" content="${esc(page.tagline || page.title)}">
${font.gf ? `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${font.gf}&display=swap" rel="stylesheet">` : ""}
<style>
*{box-sizing:border-box;margin:0}
body{
  min-height:100dvh;
  background:linear-gradient(160deg,${t.bg1},${t.bg2});
  color:${t.text};
  font-family:${font.css};
  -webkit-font-smoothing:antialiased;
  display:flex;flex-direction:column;align-items:center;
  padding:56px 20px 32px;
}
${backgroundCss(t)}
.wrap{width:100%;max-width:460px;display:flex;flex-direction:column;align-items:center;flex:1}
.cover{
  width:100%;height:${t.coverHeight}px;border-radius:18px;
  background-size:cover;background-position:center;
  box-shadow:0 10px 34px rgba(0,0,0,0.32);
  margin-bottom:${Math.round(t.avatarSize / 2) * -1}px;
}
.avatar{
  animation:avIn 0.6s cubic-bezier(0.34,1.4,0.5,1) both;
  width:${t.avatarSize}px;height:${t.avatarSize}px;
  border-radius:${t.avatarShape === "square" ? "22px" : "50%"};object-fit:cover;
  box-shadow:0 8px 32px rgba(0,0,0,0.35);margin-bottom:18px;
  ${t.cover ? `border:4px solid ${t.bg1};position:relative;z-index:1;` : ""}
}
.avatar-text{
  background:${t.accent};color:${contrastText(t.accent)};
  display:flex;align-items:center;justify-content:center;
  font-size:${Math.round(t.avatarSize * 0.42)}px;font-weight:700;
}
h1{font-size:1.5rem;letter-spacing:-0.02em;text-align:center;display:flex;align-items:center;gap:8px;justify-content:center;flex-wrap:wrap;font-weight:800}
.vbadge{
  width:22px;height:22px;flex-shrink:0;color:${t.badgeColor};
  display:inline-flex;align-items:center;justify-content:center;
}
.pills{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px}
.pill{
  display:inline-flex;align-items:center;gap:6px;
  padding:6px 13px;border-radius:999px;
  background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.18);
  backdrop-filter:blur(10px);
  font-size:0.82rem;font-weight:600;color:${t.text};
}
.pill-dot{
  width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0;
  box-shadow:0 0 0 0 rgba(34,197,94,0.65);animation:pulseDot 2s infinite;
}
@keyframes pulseDot{
  70%{box-shadow:0 0 0 7px rgba(34,197,94,0)}
  100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}
}
.pill-pin{font-size:0.85rem;line-height:1}

/* En-tête plein cadre : la photo occupe le haut, le nom est posé dessus. */
.hero{
  position:relative;width:100%;min-height:52vh;border-radius:0;
  margin:-56px -20px 0;width:calc(100% + 40px);
  background-size:cover;background-position:center;
  display:flex;align-items:flex-end;
  animation:heroIn 0.7s cubic-bezier(0.22,0.9,0.3,1) both;
}
@keyframes heroIn{from{opacity:0;transform:scale(1.04)}to{opacity:1;transform:none}}
.hero-shade{
  position:absolute;inset:0;
  background:linear-gradient(transparent 35%,rgba(0,0,0,0.55) 72%,${t.bg1});
}
.hero-body{position:relative;z-index:1;width:100%;padding:0 20px 26px;text-align:center}
.hero-body h1{font-size:2.6rem;text-shadow:0 3px 24px rgba(0,0,0,0.6)}
.hero-body .vbadge{width:30px;height:30px}
.hero + .tagline{margin-top:14px}
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
.btn-img{
  position:relative;min-height:96px;padding:0;overflow:hidden;
  background-size:cover;background-position:center;
  display:flex;align-items:flex-end;justify-content:center;
  border:none;color:#fff;
}
.btn-img::before{
  content:"";position:absolute;inset:0;
  background:linear-gradient(transparent 35%,rgba(0,0,0,0.6));
}
.btn-img span{
  position:relative;z-index:1;padding:12px;
  text-shadow:0 1px 10px rgba(0,0,0,0.8);
}
@keyframes avIn{from{opacity:0;transform:scale(0.82)}to{opacity:1;transform:none}}
@keyframes amBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes amPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}
@keyframes amWiggle{0%,88%,100%{transform:rotate(0)}90%{transform:rotate(-1.6deg)}94%{transform:rotate(1.6deg)}98%{transform:rotate(-0.8deg)}}
@keyframes amGlow{0%,100%{box-shadow:0 0 0 rgba(255,255,255,0)}50%{box-shadow:0 0 26px ${t.accent}}}
@keyframes amFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
@keyframes amShake{0%,92%,100%{transform:translateX(0)}94%{transform:translateX(-5px)}96%{transform:translateX(5px)}98%{transform:translateX(-3px)}}
@keyframes amHeart{0%,100%{transform:scale(1)}14%{transform:scale(1.06)}28%{transform:scale(1)}42%{transform:scale(1.045)}56%{transform:scale(1)}}
.anim-bounce{animation:amBounce 1.7s ease-in-out infinite}
.anim-pulse{animation:amPulse 1.9s ease-in-out infinite}
.anim-wiggle{animation:amWiggle 2.6s ease-in-out infinite}
.anim-glow{animation:amGlow 2.2s ease-in-out infinite}
.anim-float{animation:amFloat 3s ease-in-out infinite}
.anim-shake{animation:amShake 3.4s ease-in-out infinite}
.anim-heartbeat{animation:amHeart 2.4s ease-in-out infinite}

/* Pastille d'icône posée sur le bouton */
.btn-icon{
  position:absolute;left:12px;top:12px;z-index:2;
  width:38px;height:38px;border-radius:50%;
  background:#fff;color:#111;
  display:flex;align-items:center;justify-content:center;
  font-size:1.1rem;overflow:hidden;
  box-shadow:0 3px 12px rgba(0,0,0,0.3);
}
.btn-icon img{width:100%;height:100%;object-fit:cover}
.btn:not(.btn-img) .btn-icon{position:static;width:24px;height:24px;font-size:0.85rem;margin-right:8px;box-shadow:none}
.btn:not(.btn-img){display:flex;align-items:center;justify-content:center;gap:2px}

/* Intertitre entre les boutons */
.btn-heading{
  text-align:center;font-weight:800;font-size:1.02rem;letter-spacing:0.02em;
  color:${t.text};margin:10px 0 2px;
}

/* Entrée en cascade des boutons */
.btns > *{animation:btnIn 0.5s cubic-bezier(0.22,0.9,0.3,1) both}
.btns > *:nth-child(1){animation-delay:0.10s}
.btns > *:nth-child(2){animation-delay:0.17s}
.btns > *:nth-child(3){animation-delay:0.24s}
.btns > *:nth-child(4){animation-delay:0.31s}
.btns > *:nth-child(5){animation-delay:0.38s}
.btns > *:nth-child(6){animation-delay:0.45s}
.btns > *:nth-child(n+7){animation-delay:0.52s}
@keyframes btnIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.empty{color:${t.muted};margin-top:32px;font-size:0.9rem}
.foot{margin-top:48px;padding-top:16px}
.foot a{color:${t.muted};font-size:0.75rem;text-decoration:none;letter-spacing:0.04em}
@media (prefers-reduced-motion:reduce){.btn{transition:none;animation:none!important}}
</style>
</head><body>
  <main class="wrap">
    ${
      t.headerStyle === "cover"
        ? coverHeaderHtml(page, t)
        : `${coverHtml(t)}
    ${avatarHtml(page, t)}
    <h1>${esc(page.title)}${badgeHtml(t)}</h1>
    ${metaHtml(t)}`
    }
    ${page.tagline ? `<p class="tagline">${esc(page.tagline)}</p>` : ""}
    <nav class="btns">
      ${btns || ""}
    </nav>
    ${!btns ? '<p class="empty">No buttons yet.</p>' : ""}
  </main>
  ${t.hideFooter ? "" : '<footer class="foot"><a href="/">⛓ AllMySocials</a></footer>'}
${preview ? "" : ESCAPE_SCRIPT}
</body></html>`;
}
