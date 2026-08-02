// lib/pages.js
// Helpers partagés par les routes API des pages bio et de leurs boutons.
import { sb } from "@/lib/db";
import { PRESETS } from "@/lib/pagerender";

// Charge la page et vérifie qu'elle appartient à la session (ou admin).
export async function ownedPage(session, id) {
  if (!/^\d+$/.test(String(id))) return { error: "Invalid id", status: 400 };
  const rows = await sb(
    `/pages?id=eq.${id}&select=id,slug,owner,title,tagline,avatar,theme&limit=1`
  );
  const page = rows?.[0];
  if (!page) return { error: "Page not found", status: 404 };
  if (session.role !== "admin" && page.owner !== session.username) {
    return { error: "This page is not yours", status: 403 };
  }
  return { page };
}

const HEX = /^#[0-9a-fA-F]{6}$/;

// Ne garde que les clés de thème valides (preset connu, couleurs hex, etc.).
export function sanitizeTheme(input = {}) {
  const t = {};
  if (PRESETS[input.preset]) t.preset = input.preset;
  for (const k of ["bg1", "bg2", "accent"]) {
    if (HEX.test(input[k] || "")) t[k] = input[k];
  }
  if (["solid", "outline", "glass"].includes(input.btnFill)) t.btnFill = input.btnFill;
  if (["pill", "rounded", "square"].includes(input.btnShape)) t.btnShape = input.btnShape;
  return t;
}

export function validateButton({ label, url }) {
  if (!label || label.length > 80) return "Label is required (80 characters max)";
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
  } catch {
    return "Invalid URL (https://...)";
  }
  return null;
}
