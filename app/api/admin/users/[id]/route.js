// app/api/admin/users/[id]/route.js
import { sb } from "@/lib/db";
import { requireAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  const session = await requireAdmin(request);
  if (!session) return unauthorized();
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  const rows = await sb(`/users?id=eq.${id}&select=username&limit=1`);
  if (!rows?.[0]) return Response.json({ error: "Profile not found" }, { status: 404 });
  if (rows[0].username === session.username) {
    return Response.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  await sb(`/users?id=eq.${id}`, { method: "DELETE" });
  return Response.json({ ok: true });
}
