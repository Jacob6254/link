// app/api/admin/stats/route.js
import { sb } from "@/lib/db";
import { requireAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!(await requireAdmin(request))) return unauthorized();

  // Volume perso : on agrège en JS sur les 5000 derniers clics.
  const clicks = await sb(
    "/clicks?select=slug,platform,created_at&order=created_at.desc&limit=5000"
  );

  const bySlug = {}; // slug -> { total, android, ios, desktop }
  const byDay = {}; // "2026-07-31" -> total (14 derniers jours)
  const cutoff = Date.now() - 14 * 24 * 3600 * 1000;

  for (const c of clicks) {
    const s = (bySlug[c.slug] ??= { total: 0, android: 0, ios: 0, desktop: 0 });
    s.total++;
    if (s[c.platform] !== undefined) s[c.platform]++;

    const t = new Date(c.created_at).getTime();
    if (t >= cutoff) {
      const day = c.created_at.slice(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    }
  }

  return Response.json({
    total: clicks.length,
    capped: clicks.length === 5000, // true = il y a plus de clics que la fenêtre analysée
    bySlug,
    byDay,
  });
}
