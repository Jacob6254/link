// app/api/links/[id]/route.js
// Modification / suppression d'un lien : propriétaire ou admin uniquement.
import { sb, isMissingSchema, migrationError } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";
import { validateLink } from "@/lib/golink";
import { slugTaken } from "@/lib/slugs";

export const dynamic = "force-dynamic";

async function ownedLink(session, id) {
  if (!/^\d+$/.test(id)) return { error: "Invalid id", status: 400 };
  const rows = await sb(`/links?id=eq.${id}&select=id,owner&limit=1`);
  const link = rows?.[0];
  if (!link) return { error: "Link not found", status: 404 };
  if (session.role !== "admin" && link.owner !== session.username) {
    return { error: "This link is not yours", status: 403 };
  }
  return { link };
}

export async function PATCH(request, { params }) {
  const session = await requireUser(request);
  if (!session) return unauthorized();
  const { id } = await params;
  const check = await ownedLink(session, id);
  if (check.error) return Response.json({ error: check.error }, { status: check.status });

  const body = await request.json().catch(() => ({}));
  const slug = String(body.slug || "").trim().toLowerCase();
  const label = String(body.label || "").trim();
  const web_url = String(body.web_url || "").trim();
  const group_id = body.group_id ? Number(body.group_id) : null;

  const invalid = validateLink({ slug, label, web_url });
  if (invalid) return Response.json({ error: invalid }, { status: 400 });

  try {
    if (await slugTaken(slug, { exceptLinkId: id })) {
      return Response.json({ error: "That slug is already taken" }, { status: 409 });
    }
    const updated = await sb(`/links?id=eq.${id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        slug, label, web_url, group_id,
        ...(body.discord_id !== undefined
          ? { discord_id: String(body.discord_id || "").trim().slice(0, 32) || null }
          : {}),
      }),
    });
    return Response.json(updated[0]);
  } catch (err) {
    if (isMissingSchema(err)) return migrationError();
    const msg = String(err.message || "");
    if (msg.includes("23505") || msg.includes("duplicate")) {
      return Response.json({ error: "That slug is already taken" }, { status: 409 });
    }
    console.error(err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await requireUser(request);
  if (!session) return unauthorized();
  const { id } = await params;
  const check = await ownedLink(session, id);
  if (check.error) return Response.json({ error: check.error }, { status: check.status });

  // Les statistiques sont indexées par slug : sans ce nettoyage, recréer un
  // lien avec le même slug hériterait des clics de l'ancien.
  const rows = await sb(`/links?id=eq.${id}&select=slug&limit=1`);
  const slug = rows?.[0]?.slug;
  await sb(`/links?id=eq.${id}`, { method: "DELETE" });
  if (slug) {
    try {
      await sb(`/clicks?slug=eq.${encodeURIComponent(slug)}`, { method: "DELETE" });
    } catch (err) {
      console.error("Nettoyage des stats échoué :", err);
    }
  }
  return Response.json({ ok: true });
}
