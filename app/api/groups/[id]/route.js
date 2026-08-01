// app/api/groups/[id]/route.js
// Renommer / supprimer un groupe. À la suppression, les liens du groupe
// redeviennent "sans groupe" (on delete set null côté base).
import { sb } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  if (!(await requireUser(request))) return unauthorized();
  const { id } = await params;
  if (!/^\d+$/.test(id)) return Response.json({ error: "Id invalide" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const patch = {};
  if (body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (!name || name.length > 60) {
      return Response.json({ error: "Nom requis (60 caractères max)" }, { status: 400 });
    }
    patch.name = name;
  }
  if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order) || 0;
  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "Rien à modifier" }, { status: 400 });
  }

  const updated = await sb(`/groups?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!updated?.[0]) return Response.json({ error: "Groupe introuvable" }, { status: 404 });
  return Response.json(updated[0]);
}

export async function DELETE(request, { params }) {
  if (!(await requireUser(request))) return unauthorized();
  const { id } = await params;
  if (!/^\d+$/.test(id)) return Response.json({ error: "Id invalide" }, { status: 400 });
  await sb(`/groups?id=eq.${id}`, { method: "DELETE" });
  return Response.json({ ok: true });
}
