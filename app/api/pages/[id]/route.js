// app/api/pages/[id]/route.js
// Lire / modifier / supprimer une page bio : propriétaire ou admin.
import { sb, sbFallback, isMissingSchema, migrationError } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";
import { RESERVED_SLUGS } from "@/lib/golink";
import { slugTaken } from "@/lib/slugs";
import { ownedPage, sanitizeTheme } from "@/lib/pages";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const session = await requireUser(request);
  if (!session) return unauthorized();
  const { id } = await params;
  const check = await ownedPage(session, id);
  if (check.error) return Response.json({ error: check.error }, { status: check.status });

  try {
    const buttons = await sbFallback([
      `/page_buttons?page_id=eq.${id}&select=id,label,url,image,animation,icon,kind,sort_order&order=sort_order.asc,id.asc`,
      `/page_buttons?page_id=eq.${id}&select=id,label,url,image,animation,sort_order&order=sort_order.asc,id.asc`,
      `/page_buttons?page_id=eq.${id}&select=id,label,url,sort_order&order=sort_order.asc,id.asc`,
    ]);
    return Response.json({ ...check.page, buttons });
  } catch (err) {
    if (isMissingSchema(err)) return migrationError();
    throw err;
  }
}

export async function PATCH(request, { params }) {
  const session = await requireUser(request);
  if (!session) return unauthorized();
  const { id } = await params;
  const check = await ownedPage(session, id);
  if (check.error) return Response.json({ error: check.error }, { status: check.status });

  const body = await request.json().catch(() => ({}));
  const patch = {};

  if (body.slug !== undefined) {
    const slug = String(body.slug || "").trim().toLowerCase();
    if (!/^[a-z0-9-]{1,50}$/.test(slug)) {
      return Response.json(
        { error: "Invalid slug (lowercase letters, digits, hyphens)" },
        { status: 400 }
      );
    }
    if (RESERVED_SLUGS.includes(slug)) {
      return Response.json({ error: `"${slug}" is reserved by the site` }, { status: 400 });
    }
    if (slug !== check.page.slug && (await slugTaken(slug, { exceptPageId: id }))) {
      return Response.json({ error: "That slug is already taken" }, { status: 409 });
    }
    patch.slug = slug;
  }
  if (body.title !== undefined) {
    const title = String(body.title || "").trim();
    if (!title || title.length > 60) {
      return Response.json({ error: "Title is required (60 characters max)" }, { status: 400 });
    }
    patch.title = title;
  }
  if (body.tagline !== undefined) {
    patch.tagline = String(body.tagline || "").trim().slice(0, 140) || null;
  }
  if (body.avatar !== undefined) {
    patch.avatar = String(body.avatar || "").trim().slice(0, 300) || null;
  }
  if (body.theme !== undefined) {
    patch.theme = sanitizeTheme(body.theme);
  }
  if (body.discord_id !== undefined) {
    patch.discord_id = String(body.discord_id || "").trim().slice(0, 32) || null;
  }
  if (body.group_id !== undefined) {
    patch.group_id = body.group_id ? Number(body.group_id) : null;
  }
  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const updated = await sb(`/pages?id=eq.${id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    });
    return Response.json(updated[0]);
  } catch (err) {
    if (isMissingSchema(err)) return migrationError();
    throw err;
  }
}

export async function DELETE(request, { params }) {
  const session = await requireUser(request);
  if (!session) return unauthorized();
  const { id } = await params;
  const check = await ownedPage(session, id);
  if (check.error) return Response.json({ error: check.error }, { status: check.status });

  // Les statistiques sont indexées par slug : sans ce nettoyage, recréer une
  // page avec le même slug hériterait des vues et clics de l'ancienne.
  const slug = check.page.slug;
  await sb(`/pages?id=eq.${id}`, { method: "DELETE" });
  try {
    await sb(`/clicks?slug=eq.${encodeURIComponent(slug)}`, { method: "DELETE" });
  } catch (err) {
    console.error("Nettoyage des stats échoué :", err);
  }
  return Response.json({ ok: true });
}
