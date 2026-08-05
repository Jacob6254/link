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

// Logos de plateformes intégrés, utilisables comme icône de bouton via la
// valeur "brand:<clé>". Évite d'avoir à chercher et héberger un logo.
export const BRAND_ICONS = {
  onlyfans: {
    name: "OnlyFans",
    bg: "#ffffff",
    svg: `<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="9" cy="12" r="6" fill="#00AEEF"/><circle cx="9" cy="12" r="2.4" fill="#fff"/><path d="M15.4 7.2c-1.6.5-2.6 1.5-3.1 2.9 2 .3 3.6-.1 4.7-1 .8-.7 1.3-1.5 1.6-2.5-1.2 0-2.3.2-3.2.6z" fill="#00AEEF"/></svg>`,
  },
  instagram: {
    name: "Instagram",
    bg: "#ffffff",
    svg: `<svg viewBox="0 0 24 24" width="100%" height="100%"><defs><linearGradient id="ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#f9ce34"/><stop offset=".5" stop-color="#ee2a7b"/><stop offset="1" stop-color="#6228d7"/></linearGradient></defs><rect x="3" y="3" width="18" height="18" rx="5.4" fill="none" stroke="url(#ig)" stroke-width="2.2"/><circle cx="12" cy="12" r="4" fill="none" stroke="url(#ig)" stroke-width="2.2"/><circle cx="17.2" cy="6.8" r="1.3" fill="url(#ig)"/></svg>`,
  },
  tiktok: {
    name: "TikTok",
    bg: "#ffffff",
    svg: `<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M16.5 3h-2.7v12.1a2.6 2.6 0 1 1-2.3-2.6v-2.8a5.4 5.4 0 1 0 5 5.4V9.4c1 .7 2.2 1.1 3.5 1.1V7.8a3.9 3.9 0 0 1-3.5-4.8z" fill="#000"/><path d="M15.6 2.2h-2.7v12.1a2.6 2.6 0 1 1-2.3-2.6V8.9a5.4 5.4 0 1 0 5 5.4V8.6c1 .7 2.2 1.1 3.5 1.1V7a3.9 3.9 0 0 1-3.5-4.8z" fill="#25F4EE" opacity=".85"/><path d="M16 2.6h-2.7v12.1A2.6 2.6 0 1 1 11 12.1V9.3a5.4 5.4 0 1 0 5 5.4V9c1 .7 2.2 1.1 3.5 1.1V7.4A3.9 3.9 0 0 1 16 2.6z" fill="#FE2C55" opacity=".85"/></svg>`,
  },
  x: {
    name: "X",
    bg: "#000000",
    svg: `<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M17.5 3h3.1l-6.8 7.8L21.8 21h-6.2l-4.9-6.4L5 21H1.9l7.3-8.3L1.6 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.2 4.7H5.4z" fill="#fff"/></svg>`,
  },
  snapchat: {
    name: "Snapchat",
    bg: "#FFFC00",
    svg: `<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 3c2.6 0 4.3 1.9 4.3 4.6 0 .8-.1 1.6-.1 2 .3.2.7.2 1 .1.5-.1 1 .2 1 .7 0 .6-.9.9-1.4 1.1-.3.1-.5.3-.4.6.3 1 1.4 2.3 2.7 2.7.3.1.4.4.3.7-.2.5-1.2.8-2 .9-.2 0-.3.2-.3.4-.1.4-.2.7-.6.7-.5 0-1-.2-1.7-.2-1 0-1.4.2-2.1.8-.6.5-1.2.8-2 .8s-1.4-.3-2-.8c-.7-.6-1.1-.8-2.1-.8-.7 0-1.2.2-1.7.2-.4 0-.5-.3-.6-.7 0-.2-.1-.4-.3-.4-.8-.1-1.8-.4-2-.9-.1-.3 0-.6.3-.7 1.3-.4 2.4-1.7 2.7-2.7.1-.3-.1-.5-.4-.6-.5-.2-1.4-.5-1.4-1.1 0-.5.5-.8 1-.7.3.1.7.1 1-.1 0-.4-.1-1.2-.1-2C7.7 4.9 9.4 3 12 3z" fill="#000"/></svg>`,
  },
  youtube: {
    name: "YouTube",
    bg: "#ffffff",
    svg: `<svg viewBox="0 0 24 24" width="100%" height="100%"><rect x="2" y="5" width="20" height="14" rx="4" fill="#FF0000"/><path d="M10 8.8v6.4L15.5 12z" fill="#fff"/></svg>`,
  },
  telegram: {
    name: "Telegram",
    bg: "#ffffff",
    svg: `<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="10" fill="#2AABEE"/><path d="M6.5 11.9 16 8.1c.5-.2.9.1.8.7l-1.6 7.6c-.1.5-.4.6-.9.4l-2.4-1.8-1.2 1.1c-.2.2-.3.2-.5.2l.2-2.5 4.5-4.1c.2-.2 0-.3-.3-.1l-5.6 3.5-2.4-.7c-.5-.2-.5-.5.1-.7z" fill="#fff"/></svg>`,
  },
  discord: {
    name: "Discord",
    bg: "#5865F2",
    svg: `<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M18.6 6.2A14 14 0 0 0 15 5l-.3.6a11 11 0 0 1 3 1.5 11.2 11.2 0 0 0-8.4 0 11 11 0 0 1 3-1.5L12 5a14 14 0 0 0-3.6 1.2C6 9.6 5.4 13 5.6 16.3a14 14 0 0 0 4.3 2.2l.9-1.4a9 9 0 0 1-1.4-.7l.3-.2a10.2 10.2 0 0 0 8.6 0l.4.2c-.5.3-.9.5-1.4.7l.9 1.4a14 14 0 0 0 4.3-2.2c.3-3.8-.6-7.1-2.6-10.1zM9.8 14.4c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8zm4.4 0c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8z" fill="#fff"/></svg>`,
  },
  fanvue: {
    name: "Fanvue",
    bg: "#ffffff",
    svg: `<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="9" fill="#111"/><path d="M9 8h6v2h-4v2h3.4v2H11v4H9z" fill="#fff"/></svg>`,
  },
  link: {
    name: "Generic link",
    bg: "#ffffff",
    svg: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"/></svg>`,
  },
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
// À défaut de photo de couverture, on réutilise l'avatar : c'est ce que
// l'utilisateur attend quand il bascule en mode Cover.
function coverHeaderHtml(page, t) {
  const avatarUrl = /^https?:\/\//i.test(String(page.avatar || "").trim())
    ? page.avatar.trim()
    : "";
  const src = t.cover || avatarUrl;
  const bg = src
    ? `style="background-image:url('${cssUrl(src)}')"`
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

// Pastille d'icône posée sur un bouton : logo intégré ("brand:onlyfans"),
// image uploadée, ou simple emoji.
function iconHtml(icon) {
  const v = String(icon || "").trim();
  if (!v) return "";

  if (v.startsWith("brand:")) {
    const brand = BRAND_ICONS[v.slice(6)];
    if (brand) {
      return `<span class="btn-icon" style="background:${brand.bg}">${brand.svg}</span>`;
    }
    return "";
  }
  if (/^https?:\/\//i.test(v)) {
    return `<span class="btn-icon"><img src="${esc(v)}" alt=""></span>`;
  }
  return `<span class="btn-icon">${esc(v)}</span>`;
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
.btn-icon img,.btn-icon svg{width:100%;height:100%;object-fit:cover;display:block}
.btn-icon svg{padding:4px}
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
  ${t.hideFooter ? "" : '<footer class="foot"><a href="/">AllMySocials</a></footer>'}
${preview ? "" : ESCAPE_SCRIPT}
</body></html>`;
}
