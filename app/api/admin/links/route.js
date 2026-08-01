// app/api/admin/links/route.js
import { sb } from "@/lib/db";
import { requireAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!(await requireAdmin(request))) return unauthorized();
  const links = await sb("/links?select=*&order=sort_order.asc,id.asc");
  return Response.json(links);
}

export async function POST(request) {
  if (!(await requireAdmin(request))) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const slug = String(body.slug || "").trim().toLowerCase();
  const label = String(body.label || "").trim();
  const web_url = String(body.web_url || "").trim();

  if (!/^[a-z0-9-]{1,50}$/.test(slug)) {
    return Response.json(
      { error: "Slug invalide (lettres minuscules, chiffres, tirets)" },
      { status: 400 }
    );
  }
  if (!label) return Response.json({ error: "Label requis" }, { status: 400 });
  try {
    const u = new URL(web_url);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
  } catch {
    return Response.json({ error: "URL invalide (https://...)" }, { status: 400 });
  }

  try {
    const created = await sb("/links", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ slug, label, web_url, sort_order: body.sort_order ?? 0 }),
    });
    return Response.json(created[0], { status: 201 });
  } catch (err) {
    const msg = String(err.message || "");
    if (msg.includes("23505") || msg.includes("duplicate")) {
      return Response.json({ error: "Ce slug existe déjà" }, { status: 409 });
    }
    console.error(err);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
