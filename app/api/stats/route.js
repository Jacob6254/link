// app/api/stats/route.js
// Statistiques : globales ou pour un slug précis, sur une plage de dates.
// Paramètres : ?from=YYYY-MM-DD&to=YYYY-MM-DD&slug=xxx
import { sb, isMissingSchema, migrationError } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";
import { dayRange, detectOS, detectSource, toSorted } from "@/lib/stats";

export const dynamic = "force-dynamic";

const MAX_CLICKS = 20000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function defaultFrom() {
  return new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
}

export async function GET(request) {
  const session = await requireUser(request);
  if (!session) return unauthorized();

  const url = new URL(request.url);
  const to = ISO_DATE.test(url.searchParams.get("to") || "")
    ? url.searchParams.get("to")
    : new Date().toISOString().slice(0, 10);
  let from = ISO_DATE.test(url.searchParams.get("from") || "")
    ? url.searchParams.get("from")
    : defaultFrom();
  if (from > to) from = to;
  const onlySlug = (url.searchParams.get("slug") || "").trim().toLowerCase();
  const selfHost = url.hostname;

  const mine =
    session.role === "admin" ? "" : `&owner=eq.${encodeURIComponent(session.username)}`;

  // ===== Ce que l'utilisateur possède =====
  let links, groups, pages;
  try {
    links = await sb(`/links?select=slug,label,group_id${mine}`);
    groups = await sb("/groups?select=id,name&order=sort_order.asc,id.asc");
  } catch (err) {
    if (isMissingSchema(err)) return migrationError();
    throw err;
  }
  try {
    pages = await sb(`/pages?select=id,slug,title${mine}`);
  } catch (err) {
    if (!isMissingSchema(err)) throw err;
    pages = [];
  }

  const owned = new Map();
  for (const l of links) owned.set(l.slug, { kind: "link", label: l.label, group_id: l.group_id });
  for (const p of pages) owned.set(p.slug, { kind: "page", label: p.title, id: p.id });

  if (onlySlug && !owned.has(onlySlug)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const groupName = Object.fromEntries(groups.map((g) => [g.id, g.name]));
  const days = dayRange(from, to);
  const empty = {
    meta: { from, to, days: days.length, slug: onlySlug || null },
    total: 0,
    byDay: days.map((day) => ({ day, total: 0 })),
    byLink: [], byPlatform: {}, byCountry: [], byGroup: [],
    byOS: [], bySource: [], byButton: [],
  };
  if (owned.size === 0) return Response.json(empty);

  // ===== Clics sur la période =====
  const slugs = onlySlug ? [onlySlug] : [...owned.keys()];
  const slugFilter =
    session.role === "admin" && !onlySlug
      ? ""
      : `&slug=in.(${slugs.map((s) => `"${s}"`).join(",")})`;
  const clicks = await sb(
    `/clicks?select=slug,platform,country,user_agent,referrer,button_id,created_at` +
      `&created_at=gte.${from}T00:00:00Z&created_at=lte.${to}T23:59:59Z${slugFilter}` +
      `&order=created_at.desc&limit=${MAX_CLICKS}`
  );

  const byDayMap = Object.fromEntries(days.map((d) => [d, 0]));
  const byPlatform = { android: 0, ios: 0, desktop: 0 };
  const countryCount = {}, osCount = {}, sourceCount = {};
  const groupCount = {}, linkCount = {}, buttonCount = {};

  for (const c of clicks) {
    const day = c.created_at.slice(0, 10);
    if (byDayMap[day] !== undefined) byDayMap[day]++;
    if (byPlatform[c.platform] !== undefined) byPlatform[c.platform]++;

    countryCount[c.country || "??"] = (countryCount[c.country || "??"] || 0) + 1;
    const os = detectOS(c.user_agent || "");
    osCount[os] = (osCount[os] || 0) + 1;
    const src = detectSource(c.referrer, selfHost);
    sourceCount[src] = (sourceCount[src] || 0) + 1;

    const l = (linkCount[c.slug] ??= { total: 0, android: 0, ios: 0, desktop: 0 });
    l.total++;
    if (l[c.platform] !== undefined) l[c.platform]++;

    const info = owned.get(c.slug);
    const gname = (info?.group_id && groupName[info.group_id]) || "Ungrouped";
    groupCount[gname] = (groupCount[gname] || 0) + 1;

    if (c.button_id) buttonCount[c.button_id] = (buttonCount[c.button_id] || 0) + 1;
  }

  // Détail par bouton quand on regarde une page bio.
  let byButton = [];
  const target = onlySlug ? owned.get(onlySlug) : null;
  if (target?.kind === "page" && Object.keys(buttonCount).length > 0) {
    try {
      const btns = await sb(
        `/page_buttons?page_id=eq.${target.id}&select=id,label&order=sort_order.asc,id.asc`
      );
      byButton = btns
        .map((b) => ({ id: b.id, label: b.label, total: buttonCount[b.id] || 0 }))
        .sort((a, b) => b.total - a.total);
    } catch (err) {
      if (!isMissingSchema(err)) throw err;
    }
  }

  const byLink = Object.entries(linkCount)
    .map(([slug, counts]) => ({
      slug,
      label: owned.get(slug)?.label || slug,
      kind: owned.get(slug)?.kind || "link",
      ...counts,
    }))
    .sort((a, b) => b.total - a.total);

  return Response.json({
    meta: {
      from, to, days: days.length,
      slug: onlySlug || null,
      title: target?.label || null,
      kind: target?.kind || null,
      capped: clicks.length === MAX_CLICKS,
    },
    total: clicks.length,
    byDay: days.map((day) => ({ day, total: byDayMap[day] })),
    byLink,
    byPlatform,
    byCountry: toSorted(countryCount, "code"),
    byGroup: toSorted(groupCount),
    byOS: toSorted(osCount),
    bySource: toSorted(sourceCount),
    byButton,
  });
}
