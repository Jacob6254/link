// app/api/buttons/[id]/route.js
// Renommer / modifier / supprimer un bouton : propriétaire de la page ou admin.
import { sb } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";
import { ownedPage, validateButton } from "@/lib/pages";

export const dynamic = "force-dynamic";

async function ownedButton(session, id) {
  if (!/^\d+$/.test(id)) return { error: "Invalid id", status: 400 };
  const rows = await sb(`/page_buttons?id=eq.${id}&select=id,page_id,label,url&limit=1`);
  const button = rows?.[0];
  if (!button) return { error: "Button not found", status: 404 };
  const check = await ownedPage(session, button.page_id);
  if (check.error) return check;
  return { button };
}

export async function PATCH(request, { params }) {
  const session = await requireUser(request);
  if (!session) return unauthorized();
  const { id } = await params;
  const check = await ownedButton(session, id);
  if (check.error) return Response.json({ error: check.error }, { status: check.status });

  const body = await request.json().catch(() => ({}));
  const patch = {};
  if (body.label !== undefined || body.url !== undefined) {
    const label = String(body.label ?? check.button.label).trim();
    const url = String(body.url ?? check.button.url).trim();
    const invalid = validateButton({ label, url });
    if (invalid) return Response.json({ error: invalid }, { status: 400 });
    patch.label = label;
    patch.url = url;
  }
  if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order) || 0;
  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await sb(`/page_buttons?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  return Response.json(updated[0]);
}

export async function DELETE(request, { params }) {
  const session = await requireUser(request);
  if (!session) return unauthorized();
  const { id } = await params;
  const check = await ownedButton(session, id);
  if (check.error) return Response.json({ error: check.error }, { status: check.status });

  await sb(`/page_buttons?id=eq.${id}`, { method: "DELETE" });
  return Response.json({ ok: true });
}
