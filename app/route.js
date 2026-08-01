// app/route.js
// Racine du domaine : redirige vers le lien choisi dans Réglages
// (avec deep-link et tracking, comme n'importe quel lien court).
// Aucun lien configuré -> petite page 404.
import { handleGoLink } from "@/lib/golink";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

const NOT_FOUND = `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rien par ici</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
display:flex;align-items:center;justify-content:center;min-height:100dvh;margin:0;
background:#0b1120;color:#8b98b8;text-align:center}
a{color:#5da2f2;text-decoration:none}
</style>
</head><body>
<div><p>Rien par ici.</p><p><a href="/dashboard">Espace membre</a></p></div>
</body></html>`;

export async function GET(request) {
  const slug = await getSetting("root_redirect");
  if (slug) return handleGoLink(request, slug);

  return new Response(NOT_FOUND, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
