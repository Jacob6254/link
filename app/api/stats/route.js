// app/api/stats/route.js
// Statistiques : globales ou pour un slug précis, sur une plage de dates.
// Paramètres : ?from=YYYY-MM-DD&to=YYYY-MM-DD&slug=xxx
import { sb, isMissingSchema, migrationError } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";
import { dayRange, detectSource, toSorted } from "@/lib/stats";
import { detectDevice, detectOS } from "@/lib/useragent";

export const dynamic = "force-dynamic";

const MAX_ROWS = 20000;
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
    pages = await sb(`/pages?select=id,slug,title,group_id${mine}`);
  } catch (err) {
    if (!isMissingSchema(err)) throw err;
    pages = [];
  }

  const owned = new Map();
  for (const l of links) {
    owned.set(l.slug, { kind: "link", label: l.label, group_id: l.group_id });
  }
  for (const p of pages) {
    owned.set(p.slug, { kind: "page", label: p.title, group_id: p.group_id, id: p.id });
  }

  if (onlySlug && !owned.has(onlySlug)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const groupName = Object.fromEntries(groups.map((g) => [g.id, g.name]));
  const days = dayRange(from, to);
  const target = onlySlug ? owned.get(onlySlug) : null;

  const emptyMeta = {
    from, to, days: days.length,
    slug: onlySlug || null,
    title: target?.label || null,
    kind: target?.kind || null,
    capped: false,
  };
  if (owned.size === 0) {
    return Response.json({
      meta: emptyMeta, total: 0, views: 0, visitsWithClicks: 0, ctr: 0,
      byDay: days.map((day) => ({ day, total: 0, views: 0 })),
      byLink: [], byPlatform: {}, byDevice: [], byCountry: [],
      byGroup: [], byOS: [], bySource: [], byButton: [],
    });
  }

  // ===== Évènements sur la période =====
  const slugs = onlySlug ? [onlySlug] : [...owned.keys()];
  const slugFilter =
    session.role === "admin" && !onlySlug
      ? ""
      : `&slug=in.(${slugs.map((s) => `"${s}"`).join(",")})`;

  let rows;
  try {
    rows = await sb(
      `/clicks?select=slug,platform,device,country,user_agent,referrer,button_id,event,visit_id,created_at` +
        `&created_at=gte.${from}T00:00:00Z&created_at=lte.${to}T23:59:59Z${slugFilter}` +
        `&order=created_at.desc&limit=${MAX_ROWS}`
    );
  } catch (err) {
    if (!isMissingSchema(err)) throw err;
    // Colonnes v7 pas encore migrées : tout est traité comme un clic.
    rows = await sb(
      `/clicks?select=slug,platform,country,user_agent,referrer,button_id,created_at` +
        `&created_at=gte.${from}T00:00:00Z&created_at=lte.${to}T23:59:59Z${slugFilter}` +
        `&order=created_at.desc&limit=${MAX_ROWS}`
    );
  }

  const clickDay = Object.fromEntries(days.map((d) => [d, 0]));
  const viewDay = Object.fromEntries(days.map((d) => [d, 0]));
  const byPlatform = { android: 0, ios: 0, desktop: 0 };
  const deviceCount = { mobile: 0, desktop: 0, tablet: 0 };
  const countryCount = {}, osCount = {}, sourceCount = {};
  const groupCount = {}, linkCount = {}, buttonCount = {};
  const visitsSeen = new Set(), visitsClicked = new Set();
  let total = 0, views = 0;

  for (const c of rows) {
    // Filet de sécurité : des clics peuvent subsister pour un slug supprimé
    // (suppression antérieure au nettoyage automatique). On ne les compte pas.
    if (!owned.has(c.slug)) continue;

    const isView = c.event === "view";
    const day = c.created_at.slice(0, 10);

    if (isView) {
      views++;
      if (viewDay[day] !== undefined) viewDay[day]++;
      if (c.visit_id) visitsSeen.add(c.visit_id);
      // Une vue renseigne l'audience (appareil, pays, source) mais n'est pas
      // un clic : elle ne doit pas gonfler les compteurs de clics.
      const dev = c.device || detectDevice(c.user_agent || "");
      if (deviceCount[dev] !== undefined) deviceCount[dev]++;
      countryCount[c.country || "??"] = (countryCount[c.country || "??"] || 0) + 1;
      osCount[detectOS(c.user_agent || "")] =
        (osCount[detectOS(c.user_agent || "")] || 0) + 1;
      const src = detectSource(c.referrer, selfHost);
      sourceCount[src] = (sourceCount[src] || 0) + 1;
      continue;
    }

    total++;
    if (clickDay[day] !== undefined) clickDay[day]++;
    if (c.visit_id) visitsClicked.add(c.visit_id);
    if (byPlatform[c.platform] !== undefined) byPlatform[c.platform]++;

    const dev = c.device || detectDevice(c.user_agent || "");
    if (deviceCount[dev] !== undefined) deviceCount[dev]++;

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
  if (target?.kind === "page") {
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

  const visitsWithClicks = visitsClicked.size;
  const ctr = views > 0 ? Math.round((visitsWithClicks / views) * 1000) / 10 : 0;

  return Response.json({
    meta: { ...emptyMeta, capped: rows.length === MAX_ROWS },
    total,
    views,
    visitsWithClicks,
    ctr,
    byDay: days.map((day) => ({ day, total: clickDay[day], views: viewDay[day] })),
    byLink,
    byPlatform,
    byDevice: [
      { name: "Mobile", key: "mobile", total: deviceCount.mobile },
      { name: "Desktop", key: "desktop", total: deviceCount.desktop },
      { name: "Tablet", key: "tablet", total: deviceCount.tablet },
    ],
    byCountry: toSorted(countryCount, "code"),
    byGroup: toSorted(groupCount),
    byOS: toSorted(osCount),
    bySource: toSorted(sourceCount),
    byButton,
  });
}
