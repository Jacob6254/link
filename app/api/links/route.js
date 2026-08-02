// app/api/links/route.js
// Liens : chaque profil gère les siens ; les admins voient tout.
import { sb, isMissingSchema, migrationError } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";
import { validateLink } from "@/lib/golink";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = await requireUser(request);
  if (!session) return unauthorized();
  const filter =
    session.role === "admin" ? "" : `&owner=eq.${encodeURIComponent(session.username)}`;
  try {
    const links = await sb(
      `/links?select=id,slug,label,web_url,group_id,owner,sort_order&order=sort_order.asc,id.asc${filter}`
    );
    return Response.json(links);
  } catch (err) {
    if (isMissingSchema(err)) return migrationError();
    throw err;
  }
}

export async function POST(request) {
  const session = await requireUser(request);
  if (!session) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const slug = String(body.slug || "").trim().toLowerCase();
  const label = String(body.label || "").trim();
  const web_url = String(body.web_url || "").trim();
  const group_id = body.group_id ? Number(body.group_id) : null;

  const invalid = validateLink({ slug, label, web_url });
  if (invalid) return Response.json({ error: invalid }, { status: 400 });

  try {
    const created = await sb("/links", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        slug,
        label,
        web_url,
        group_id,
        owner: session.username,
        sort_order: body.sort_order ?? 0,
      }),
    });
    return Response.json(created[0], { status: 201 });
  } catch (err) {
    const msg = String(err.message || "");
    if (msg.includes("23505") || msg.includes("duplicate")) {
      return Response.json({ error: "That slug is already taken" }, { status: 409 });
    }
    console.error(err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
