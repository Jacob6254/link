// app/api/admin/users/[id]/route.js
import { sb } from "@/lib/db";
import { requireAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  const session = await requireAdmin(request);
  if (!session) return unauthorized();
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "Id invalide" }, { status: 400 });
  }

  const rows = await sb(`/users?id=eq.${id}&select=username&limit=1`);
  if (!rows?.[0]) return Response.json({ error: "Profil introuvable" }, { status: 404 });
  if (rows[0].username === session.username) {
    return Response.json(
      { error: "Impossible de supprimer votre propre compte" },
      { status: 400 }
    );
  }

  await sb(`/users?id=eq.${id}`, { method: "DELETE" });
  return Response.json({ ok: true });
}
