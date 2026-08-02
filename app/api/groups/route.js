// app/api/groups/route.js
// Groupes de liens (sections de la page bio) — partagés entre les profils.
import { sb, isMissingSchema, migrationError } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!(await requireUser(request))) return unauthorized();
  try {
    const groups = await sb("/groups?select=id,name,sort_order&order=sort_order.asc,id.asc");
    return Response.json(groups);
  } catch (err) {
    if (isMissingSchema(err)) return migrationError();
    throw err;
  }
}

export async function POST(request) {
  if (!(await requireUser(request))) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name || name.length > 60) {
    return Response.json({ error: "Name is required (60 characters max)" }, { status: 400 });
  }
  const created = await sb("/groups", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ name, sort_order: body.sort_order ?? 0 }),
  });
  return Response.json(created[0], { status: 201 });
}
