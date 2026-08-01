// app/api/admin/links/[id]/route.js
import { sb } from "@/lib/db";
import { requireAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  if (!(await requireAdmin(request))) return unauthorized();
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "Id invalide" }, { status: 400 });
  }
  await sb(`/links?id=eq.${id}`, { method: "DELETE" });
  return Response.json({ ok: true });
}
