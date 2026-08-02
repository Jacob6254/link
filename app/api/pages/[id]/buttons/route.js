// app/api/pages/[id]/buttons/route.js
// Ajouter un bouton à une page bio.
import { sb } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";
import { ownedPage, sanitizeButtonExtras, validateButton } from "@/lib/pages";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const session = await requireUser(request);
  if (!session) return unauthorized();
  const { id } = await params;
  const check = await ownedPage(session, id);
  if (check.error) return Response.json({ error: check.error }, { status: check.status });

  const body = await request.json().catch(() => ({}));
  const label = String(body.label || "").trim();
  const url = String(body.url || "").trim();
  const invalid = validateButton({ label, url });
  if (invalid) return Response.json({ error: invalid }, { status: 400 });

  const row = {
    page_id: Number(id),
    label,
    url,
    sort_order: Number(body.sort_order) || 0,
  };
  const extraError = sanitizeButtonExtras(body, row);
  if (extraError) return Response.json({ error: extraError }, { status: 400 });

  const created = await sb("/page_buttons", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  return Response.json(created[0], { status: 201 });
}
