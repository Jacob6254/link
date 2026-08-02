// app/[slug]/route.js
// Racine des slugs : lien court direct OU page bio (type Linktree).
// Les pages statiques (/login, /dashboard, ...) ont priorité sur cette route.
import { sb, isMissingSchema } from "@/lib/db";
import { handleGoLink } from "@/lib/golink";
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
      const buttons = await sb(
        `/page_buttons?page_id=eq.${page.id}&select=id,label&order=sort_order.asc,id.asc`
      );
      return new Response(renderPageHTML(page, buttons), {
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
