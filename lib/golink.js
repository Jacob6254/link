// lib/golink.js
// Cœur des liens courts : lit le lien en base, log le clic (avec pays via
// les headers Vercel), redirige selon la plateforme. Utilisé par /[slug]
// et par /go/[slug] (compatibilité avec les anciens liens partagés).
import { sb } from "@/lib/db";
import {
  buildBrowserIntent, buildDeepLinks, buildSafariUrl, detectInAppBrowser,
} from "@/lib/deeplink";

// Slugs qu'un lien ou une page ne peut pas prendre (routes réservées du site).
export const RESERVED_SLUGS = [
  "login", "dashboard", "admin", "api", "go", "b",
  "favicon.ico", "robots.txt", "sitemap.xml",
];

// Validation d'un lien (création / modification).
export function validateLink({ slug, label, web_url }) {
  if (!/^[a-z0-9-]{1,50}$/.test(slug)) {
    return "Invalid slug (lowercase letters, digits, hyphens)";
  }
  if (RESERVED_SLUGS.includes(slug)) {
    return `"${slug}" is reserved by the site`;
  }
  if (!label) return "Label is required";
  try {
    const u = new URL(web_url);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
  } catch {
    return "Invalid URL (https://...)";
  }
  return null;
}

function detectPlatform(ua) {
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "desktop";
}

async function logClick({ slug, platform, userAgent, referrer, country, buttonId }) {
  const row = {
    slug,
    platform,
    user_agent: userAgent.slice(0, 500),
    referrer: referrer ? referrer.slice(0, 500) : null,
    country: country || null,
  };
  if (buttonId) row.button_id = buttonId;
  try {
    await sb("/clicks", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
  } catch (err) {
    // Le tracking ne doit JAMAIS bloquer la redirection
    console.error("Tracking échoué :", err);
  }
}

// Page-relais iOS : tente le schéma de l'app, puis (dans une webview intégrée)
// le schéma Safari, et propose toujours une sortie manuelle — sur iOS aucune
// méthode n'est garantie, l'utilisateur ne doit jamais rester bloqué.
function iosInterstitial(label, iosScheme, webUrl, inApp) {
  const scheme = JSON.stringify(iosScheme);
  const web = JSON.stringify(webUrl);
  const safari = JSON.stringify(inApp ? buildSafariUrl(webUrl) : null);
  const esc = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Opening…</title>
<style>
*{box-sizing:border-box;margin:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
display:flex;flex-direction:column;align-items:center;justify-content:center;
min-height:100dvh;padding:24px;background:#0b1120;color:#eaf0fb;text-align:center;gap:18px}
.spin{width:38px;height:38px;border-radius:50%;border:3px solid rgba(57,135,229,.25);
border-top-color:#3987e5;animation:s .9s linear infinite}
@keyframes s{to{transform:rotate(360deg)}}
p{color:#8794b3;font-size:.95rem;max-width:30ch;line-height:1.5}
strong{color:#eaf0fb}
#manual{display:none;flex-direction:column;gap:10px;width:100%;max-width:300px}
a.btn,button.btn{display:block;width:100%;padding:14px 18px;border-radius:12px;
font-weight:600;font-size:.95rem;text-decoration:none;border:none;cursor:pointer;
background:#3987e5;color:#fff;font-family:inherit}
button.alt{background:transparent;color:#eaf0fb;border:1px solid #223050}
</style>
</head><body>
<div class="spin" id="spin"></div>
<p id="msg">Opening <strong>${esc(label)}</strong>…</p>
<div id="manual">
  <button class="btn" id="open">Open in browser</button>
  <button class="btn alt" id="copy">Copy link</button>
</div>
<script>
(function () {
  var scheme = ${scheme}, web = ${web}, safari = ${safari};
  var left = false, escaped = false;
  function gone(){ left = true; }
  document.addEventListener("visibilitychange", function(){ if (document.hidden) gone(); });
  window.addEventListener("pagehide", gone);

  function showManual(hint){
    if (left) return;
    document.getElementById("spin").style.display = "none";
    document.getElementById("msg").textContent = hint;
    document.getElementById("manual").style.display = "flex";
  }

  // Sortie de la webview. Appelée automatiquement (souvent bloquée sans geste)
  // ET sur le premier tap de l'utilisateur, où elle fonctionne.
  function escape(){
    if (left || !safari) return false;
    escaped = true;
    location.href = safari;
    return true;
  }

  // N'IMPORTE QUEL tap réessaie, avec un vrai user gesture cette fois.
  if (safari) {
    document.addEventListener("click", function(e){
      if (e.target && e.target.id === "copy") return;
      escape();
    }, true);
  }

  document.getElementById("open").addEventListener("click", function(){
    if (!escape()) location.href = web;
  });

  document.getElementById("copy").addEventListener("click", function(e){
    e.stopPropagation();
    navigator.clipboard && navigator.clipboard.writeText(web);
    this.textContent = "Copied \\u2713";
  });

  // 1) le schéma de l'app native, s'il existe
  if (scheme) {
    location.href = scheme;
    setTimeout(function(){ if (!left) step2(); }, 1400);
  } else {
    step2();
  }

  // 2) sortie de la webview vers Safari, sinon navigation web normale
  function step2(){
    if (left) return;
    if (safari) {
      escape();
      setTimeout(function(){
        showManual("Tap anywhere to open it outside this app.");
      }, 900);
    } else {
      location.replace(web);
    }
  }
})();
</script>
</body></html>`;
}

// Redirection avec deep-link + tracking, pour un lien court (buttonId null)
// ou pour un bouton de page bio (slug = slug de la page, buttonId renseigné).
export async function redirectWithTracking(request, { slug, label, web_url, buttonId = null }) {
  const link = { label, web_url };
  const userAgent = request.headers.get("user-agent") || "";
  const referrer = request.headers.get("referer") || "";
  const country =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    null;
  const platform = detectPlatform(userAgent);
  const inApp = detectInAppBrowser(userAgent);
  const { iosScheme, androidIntent } = buildDeepLinks(link.web_url);

  // await volontaire : sur Vercel serverless, une promesse non attendue
  // peut être tuée avant d'aboutir.
  await logClick({ slug, platform, userAgent, referrer, country, buttonId });

  const redirect = (location) =>
    new Response(null, { status: 302, headers: { Location: location, "Cache-Control": "no-store" } });

  if (platform === "android") {
    // 302 vers intent:// : conserve le "user gesture" du clic, et le fallback
    // web est DANS l'URL intent (S.browser_fallback_url).
    if (androidIntent) return redirect(androidIntent);
    // Pas d'app connue : depuis une webview intégrée, on force l'ouverture
    // dans le navigateur par défaut.
    if (inApp) {
      const browserIntent = buildBrowserIntent(link.web_url);
      if (browserIntent) return redirect(browserIntent);
    }
    return redirect(link.web_url);
  }

  if (platform === "ios" && (iosScheme || inApp)) {
    return new Response(iosInterstitial(link.label, iosScheme, link.web_url, inApp), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return redirect(link.web_url);
}

// Lien court classique : lit le lien en base puis redirige.
export async function handleGoLink(request, slug) {
  if (!/^[a-z0-9-]{1,50}$/.test(slug) || RESERVED_SLUGS.includes(slug)) {
    return new Response("Link not found", { status: 404 });
  }

  let link;
  try {
    const rows = await sb(`/links?slug=eq.${slug}&select=label,web_url&limit=1`);
    link = rows?.[0];
  } catch (err) {
    console.error(err);
    return new Response("Server error", { status: 500 });
  }
  if (!link) return null; // laisse l'appelant tenter une page bio

  return redirectWithTracking(request, {
    slug,
    label: link.label,
    web_url: link.web_url,
  });
}
