// app/api/templates/route.js
// Templates de design : un thème enregistré, réutilisable sur d'autres pages.
import { sb, isMissingSchema, migrationError } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";
import { sanitizeTheme } from "@/lib/pages";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = await requireUser(request);
  if (!session) return unauthorized();
  const mine =
    session.role === "admin" ? "" : `&owner=eq.${encodeURIComponent(session.username)}`;
  try {
    const rows = await sb(`/templates?select=id,name,theme,owner&order=id.desc${mine}`);
    return Response.json(rows);
  } catch (err) {
    if (isMissingSchema(err)) return Response.json([]); // table pas encore migrée
    throw err;
  }
}

export async function POST(request) {
  const session = await requireUser(request);
  if (!session) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name || name.length > 60) {
    return Response.json({ error: "Name is required (60 characters max)" }, { status: 400 });
  }
  try {
    const created = await sb("/templates", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        name,
        owner: session.username,
        theme: sanitizeTheme(body.theme || {}),
      }),
    });
    return Response.json(created[0], { status: 201 });
  } catch (err) {
    if (isMissingSchema(err)) return migrationError();
    throw err;
  }
}
