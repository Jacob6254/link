// lib/settings.js
// Réglages du site stockés en clé/valeur dans Supabase.
import { sb, isMissingSchema } from "@/lib/db";

export async function getSetting(key) {
  try {
    const rows = await sb(
      `/settings?key=eq.${encodeURIComponent(key)}&select=value&limit=1`
    );
    return rows?.[0]?.value || null;
  } catch (err) {
    // Table pas encore migrée : on se comporte comme si le réglage était vide.
    if (isMissingSchema(err)) return null;
    throw err;
  }
}

export async function setSetting(key, value) {
  await sb("/settings", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key, value }),
  });
}
