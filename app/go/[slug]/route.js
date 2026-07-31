// app/go/[slug]/route.js
// Cœur du système : lit le lien en base, log le clic, redirige selon la plateforme.
import { sb } from "@/lib/db";
import { buildDeepLinks } from "@/lib/deeplink";

export const dynamic = "force-dynamic";

function detectPlatform(ua) {
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "desktop";
}

async function logClick({ slug, platform, userAgent, referrer }) {
  try {
    await sb("/clicks", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        slug,
        platform,
        user_agent: userAgent.slice(0, 500),
        referrer: referrer ? referrer.slice(0, 500) : null,
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
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100dvh;margin:0;background:#111;color:#eee}</style>
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

export async function GET(request, { params }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,50}$/.test(slug)) {
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
  const platform = detectPlatform(userAgent);
  const { iosScheme, androidIntent } = buildDeepLinks(link.web_url);

  // await volontaire : sur Vercel serverless, une promesse non attendue
  // peut être tuée avant d'aboutir.
  await logClick({ slug, platform, userAgent, referrer });

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
