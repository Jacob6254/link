// app/[slug]/route.js
// Racine des slugs : lien court direct OU page bio (type Linktree).
// Les pages statiques (/login, /dashboard, ...) ont priorité sur cette route.
import { sb, sbFallback, isMissingSchema } from "@/lib/db";
import { handleGoLink, logEvent } from "@/lib/golink";
import { renderPageHTML } from "@/lib/pagerender";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { slug } = await params;

  // 1) Lien court classique.
  const linkResponse = await handleGoLink(request, slug);
  if (linkResponse) return linkResponse;

  // 2) Page bio.
  try {
    const pages = await sb(
      `/pages?slug=eq.${slug}&select=id,slug,title,tagline,avatar,theme&limit=1`
    );
    const page = pages?.[0];
    if (page) {
      // Le select doit couvrir TOUTES les colonnes utilisées par le rendu,
      // sinon la page publique perd des réglages visibles dans l'éditeur.
      const buttons = await sbFallback([
        `/page_buttons?page_id=eq.${page.id}&select=id,label,image,animation,icon,kind,font&order=sort_order.asc,id.asc`,
        `/page_buttons?page_id=eq.${page.id}&select=id,label,image,animation,icon,kind&order=sort_order.asc,id.asc`,
        `/page_buttons?page_id=eq.${page.id}&select=id,label,image,animation&order=sort_order.asc,id.asc`,
        `/page_buttons?page_id=eq.${page.id}&select=id,label&order=sort_order.asc,id.asc`,
      ]);
      // Une visite = un identifiant, repassé aux boutons via ?v= : c'est ce
      // qui permet de calculer le taux de clic (combien de visites cliquent).
      const visitId = crypto.randomUUID().slice(0, 18);
      await logEvent(request, { slug, event: "view", visitId });

      return new Response(renderPageHTML(page, buttons, { visitId }), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }
  } catch (err) {
    // Tables v3 pas encore migrées : on retombe sur le 404.
    if (!isMissingSchema(err)) {
      console.error(err);
      return new Response("Server error", { status: 500 });
    }
  }

  return new Response("Link not found", { status: 404 });
}
