// lib/slugs.js
// Un slug est unique sur TOUT le site : liens courts ET pages bio partagent
// la racine du domaine.
import { sb, isMissingSchema } from "@/lib/db";

export async function slugTaken(slug, { exceptLinkId = null, exceptPageId = null } = {}) {
  const links = await sb(`/links?slug=eq.${slug}&select=id&limit=1`);
  if (links?.[0] && String(links[0].id) !== String(exceptLinkId)) return true;

  try {
    const pages = await sb(`/pages?slug=eq.${slug}&select=id&limit=1`);
    if (pages?.[0] && String(pages[0].id) !== String(exceptPageId)) return true;
  } catch (err) {
    if (!isMissingSchema(err)) throw err; // table pages pas encore migrée
  }
  return false;
}
