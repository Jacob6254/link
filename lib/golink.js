// lib/golink.js
// Cœur des liens courts : lit le lien en base, log le clic (avec pays via
// les headers Vercel), redirige selon la plateforme. Utilisé par /[slug]
// et par /go/[slug] (compatibilité avec les anciens liens partagés).
import { sb } from "@/lib/db";
import { buildDeepLinks } from "@/lib/deeplink";

// Slugs qu'un lien ne peut pas prendre (routes réservées du site).
export const RESERVED_SLUGS = [
  "login", "dashboard", "admin", "api", "go",
  "favicon.ico", "robots.txt", "sitemap.xml",
];

// Validation d'un lien (création / modification).
export function validateLink({ slug, label, web_url }) {
  if (!/^[a-z0-9-]{1,50}$/.test(slug)) {
    return "Slug invalide (lettres minuscules, chiffres, tirets)";
  }
  if (RESERVED_SLUGS.includes(slug)) {
    return `« ${slug} » est réservé par le site`;
  }
  if (!label) return "Label requis";
  try {
    const u = new URL(web_url);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
  } catch {
    return "URL invalide (https://...)";
  }
  return null;
}

function detectPlatform(ua) {
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "desktop";
}

async function logClick({ slug, platform, userAgent, referrer, country }) {
  try {
    await sb("/clicks", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        slug,
        platform,
        user_agent: userAgent.slice(0, 500),
        referrer: referrer ? referrer.slice(0, 500) : null,
        country: country || null,
      }),
    });
  } catch (err) {
    // Le tracking ne doit JAMAIS bloquer la redirection
    console.error("Tracking échoué :", err);
  }
}

function iosInterstitial(label, iosScheme, webUrl) {
  const scheme = JSON.stringify(iosScheme);
  const web = JSON.stringify(webUrl);
  return `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Redirection…</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100dvh;margin:0;background:#0a1122;color:#e8edf7}</style>
</head><body>
<p>Ouverture de ${label}…</p>
<script>
(function () {
  var scheme = ${scheme};
  var web = ${web};
  if (!scheme) { location.replace(web); return; }
  var t = setTimeout(function () { location.replace(web); }, 1600);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) clearTimeout(t);
  });
  window.addEventListener("pagehide", function () { clearTimeout(t); });
  location.href = scheme;
})();
</script>
</body></html>`;
}

export async function handleGoLink(request, slug) {
  if (!/^[a-z0-9-]{1,50}$/.test(slug) || RESERVED_SLUGS.includes(slug)) {
    return new Response("Lien inconnu", { status: 404 });
  }

  let link;
  try {
    const rows = await sb(`/links?slug=eq.${slug}&select=label,web_url&limit=1`);
    link = rows?.[0];
  } catch (err) {
    console.error(err);
    return new Response("Erreur serveur", { status: 500 });
  }
  if (!link) return new Response("Lien inconnu", { status: 404 });

  const userAgent = request.headers.get("user-agent") || "";
  const referrer = request.headers.get("referer") || "";
  const country =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    null;
  const platform = detectPlatform(userAgent);
  const { iosScheme, androidIntent } = buildDeepLinks(link.web_url);

  // await volontaire : sur Vercel serverless, une promesse non attendue
  // peut être tuée avant d'aboutir.
  await logClick({ slug, platform, userAgent, referrer, country });

  if (platform === "android" && androidIntent) {
    // 302 vers intent:// : conserve le "user gesture" du clic.
    // Le fallback web est DANS l'URL intent (S.browser_fallback_url).
    return new Response(null, {
      status: 302,
      headers: { Location: androidIntent, "Cache-Control": "no-store" },
    });
  }

  if (platform === "ios") {
    return new Response(iosInterstitial(link.label, iosScheme, link.web_url), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(null, {
    status: 302,
    headers: { Location: link.web_url, "Cache-Control": "no-store" },
  });
}
