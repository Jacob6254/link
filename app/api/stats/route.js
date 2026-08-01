// app/api/stats/route.js
// Statistiques détaillées : par jour (30 j), par lien, par plateforme,
// par pays. Chaque profil voit les stats de SES liens ; les admins tout.
import { sb, isMissingSchema, migrationError } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;
const MAX_CLICKS = 10000;

export async function GET(request) {
  const session = await requireUser(request);
  if (!session) return unauthorized();

  const filter =
    session.role === "admin" ? "" : `&owner=eq.${encodeURIComponent(session.username)}`;
  let links, groups;
  try {
    links = await sb(`/links?select=slug,label,group_id${filter}`);
    groups = await sb("/groups?select=id,name&order=sort_order.asc,id.asc");
  } catch (err) {
    if (isMissingSchema(err)) return migrationError();
    throw err;
  }
  const labelBySlug = Object.fromEntries(links.map((l) => [l.slug, l.label]));
  const groupBySlug = Object.fromEntries(links.map((l) => [l.slug, l.group_id]));
  const groupName = Object.fromEntries(groups.map((g) => [g.id, g.name]));
  const slugs = links.map((l) => l.slug);

  if (slugs.length === 0) {
    return Response.json({
      total: 0, capped: false, windowDays: WINDOW_DAYS,
      byDay: {}, byLink: [], byPlatform: {}, byCountry: [], byGroup: [],
    });
  }

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 3600 * 1000).toISOString();
  const slugFilter =
    session.role === "admin"
      ? ""
      : `&slug=in.(${slugs.map((s) => `"${s}"`).join(",")})`;
  const clicks = await sb(
    `/clicks?select=slug,platform,country,created_at&created_at=gte.${since}` +
      `${slugFilter}&order=created_at.desc&limit=${MAX_CLICKS}`
  );

  const byDay = {};
  const byPlatform = { android: 0, ios: 0, desktop: 0 };
  const countryCount = {};
  const linkCount = {};
  const groupCount = {};

  for (const c of clicks) {
    const day = c.created_at.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;

    if (byPlatform[c.platform] !== undefined) byPlatform[c.platform]++;

    const country = c.country || "??";
    countryCount[country] = (countryCount[country] || 0) + 1;

    const l = (linkCount[c.slug] ??= { total: 0, android: 0, ios: 0, desktop: 0 });
    l.total++;
    if (l[c.platform] !== undefined) l[c.platform]++;

    const gid = groupBySlug[c.slug];
    const gname = (gid && groupName[gid]) || "Sans groupe";
    groupCount[gname] = (groupCount[gname] || 0) + 1;
  }

  // Jours manquants à 0 pour un graphique continu.
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const day = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
    byDay[day] ??= 0;
  }

  const byLink = Object.entries(linkCount)
    .map(([slug, counts]) => ({ slug, label: labelBySlug[slug] || slug, ...counts }))
    .sort((a, b) => b.total - a.total);

  const byCountry = Object.entries(countryCount)
    .map(([code, total]) => ({ code, total }))
    .sort((a, b) => b.total - a.total);

  const byGroup = Object.entries(groupCount)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  return Response.json({
    total: clicks.length,
    capped: clicks.length === MAX_CLICKS,
    windowDays: WINDOW_DAYS,
    byDay,
    byLink,
    byPlatform,
    byCountry,
    byGroup,
  });
}
