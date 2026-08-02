// app/b/[id]/route.js
// Clic sur un bouton de page bio : deep-link + tracking (slug de la page,
// button_id pour le détail par bouton), puis redirection.
import { sb, isMissingSchema } from "@/lib/db";
import { redirectWithTracking } from "@/lib/golink";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return new Response("Link not found", { status: 404 });

  let button;
  try {
    const rows = await sb(
      `/page_buttons?id=eq.${id}&select=id,label,url,pages(slug)&limit=1`
    );
    button = rows?.[0];
  } catch (err) {
    if (isMissingSchema(err)) return new Response("Link not found", { status: 404 });
    console.error(err);
    return new Response("Server error", { status: 500 });
  }
  if (!button) return new Response("Link not found", { status: 404 });

  return redirectWithTracking(request, {
    slug: button.pages?.slug || `button-${id}`,
    label: button.label,
    web_url: button.url,
    buttonId: button.id,
  });
}
