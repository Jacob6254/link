// app/api/templates/[id]/route.js
import { sb } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  const session = await requireUser(request);
  if (!session) return unauthorized();
  const { id } = await params;
  if (!/^\d+$/.test(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const rows = await sb(`/templates?id=eq.${id}&select=owner&limit=1`);
  if (!rows?.[0]) return Response.json({ error: "Template not found" }, { status: 404 });
  if (session.role !== "admin" && rows[0].owner !== session.username) {
    return Response.json({ error: "This template is not yours" }, { status: 403 });
  }

  await sb(`/templates?id=eq.${id}`, { method: "DELETE" });
  return Response.json({ ok: true });
}
