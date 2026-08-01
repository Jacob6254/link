// app/api/admin/settings/route.js
// Réglages du site (admins uniquement).
import { sb, isMissingSchema, migrationError } from "@/lib/db";
import { requireAdmin, unauthorized } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!(await requireAdmin(request))) return unauthorized();
  return Response.json({ root_redirect: await getSetting("root_redirect") || "" });
}

export async function PUT(request) {
  if (!(await requireAdmin(request))) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const slug = String(body.root_redirect || "").trim().toLowerCase();

  if (slug) {
    if (!/^[a-z0-9-]{1,50}$/.test(slug)) {
      return Response.json({ error: "Slug invalide" }, { status: 400 });
    }
    const rows = await sb(`/links?slug=eq.${slug}&select=slug&limit=1`);
    if (!rows?.[0]) {
      return Response.json({ error: "Ce lien n'existe pas" }, { status: 400 });
    }
  }

  try {
    await setSetting("root_redirect", slug);
  } catch (err) {
    if (isMissingSchema(err)) return migrationError();
    throw err;
  }
  return Response.json({ ok: true, root_redirect: slug });
}
