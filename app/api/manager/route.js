// app/api/manager/route.js
// Vue unifiée du Link Manager : groupes + pages bio + liens courts + compteurs
// de clics, en un seul appel.
import { sb, isMissingSchema, migrationError } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TREND_DAYS = 7;

export async function GET(request) {
  const session = await requireUser(request);
  if (!session) return unauthorized();
  const mine =
    session.role === "admin" ? "" : `&owner=eq.${encodeURIComponent(session.username)}`;

  let groups, links, pages;
  try {
    groups = await sb("/groups?select=id,name,sort_order&order=sort_order.asc,id.asc");
    links = await sb(
      `/links?select=id,slug,label,web_url,group_id,owner&order=sort_order.asc,id.asc${mine}`
    );
  } catch (err) {
    if (isMissingSchema(err)) return migrationError();
    throw err;
  }

  try {
    pages = await sb(
      `/pages?select=id,slug,title,tagline,avatar,group_id,owner&order=id.asc${mine}`
    );
  } catch (err) {
    if (!isMissingSchema(err)) throw err;
    // Colonne group_id (v5) pas encore migrée : les pages restent "ungrouped".
    pages = await sb(
      `/pages?select=id,slug,title,tagline,avatar,owner&order=id.asc${mine}`
    );
  }

  // Clics des 7 derniers jours, agrégés par slug.
  const since = new Date(Date.now() - TREND_DAYS * 24 * 3600 * 1000).toISOString();
  const todayKey = new Date().toISOString().slice(0, 10);
  let clicks = [];
  try {
    clicks = await sb(
      `/clicks?select=slug,created_at&created_at=gte.${since}&order=created_at.desc&limit=10000`
    );
  } catch (err) {
    console.error(err); // le manager doit s'afficher même sans stats
  }

  const stats = {}; // slug -> { today, week, byDay[] }
  const dayIndex = {};
  for (let i = 0; i < TREND_DAYS; i++) {
    const d = new Date(Date.now() - (TREND_DAYS - 1 - i) * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    dayIndex[d] = i;
  }
  for (const c of clicks) {
    const s = (stats[c.slug] ??= {
      today: 0,
      week: 0,
      byDay: Array(TREND_DAYS).fill(0),
    });
    const day = c.created_at.slice(0, 10);
    s.week++;
    if (day === todayKey) s.today++;
    if (dayIndex[day] !== undefined) s.byDay[dayIndex[day]]++;
  }
  const statFor = (slug) =>
    stats[slug] || { today: 0, week: 0, byDay: Array(TREND_DAYS).fill(0) };

  const items = [
    ...pages.map((p) => ({
      kind: "page",
      id: p.id,
      slug: p.slug,
      title: p.title,
      subtitle: p.tagline || null,
      avatar: p.avatar || null,
      group_id: p.group_id,
      owner: p.owner,
      stats: statFor(p.slug),
    })),
    ...links.map((l) => ({
      kind: "link",
      id: l.id,
      slug: l.slug,
      title: l.label,
      subtitle: l.web_url,
      web_url: l.web_url,
      avatar: null,
      group_id: l.group_id,
      owner: l.owner,
      stats: statFor(l.slug),
    })),
  ];

  return Response.json({ groups, items, trendDays: TREND_DAYS });
}
