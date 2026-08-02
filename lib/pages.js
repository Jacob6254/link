// lib/pages.js
// Helpers partagés par les routes API des pages bio et de leurs boutons.
import { sb } from "@/lib/db";
import { ANIMATIONS, FONTS, PRESETS } from "@/lib/pagerender";

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

function isHttpUrl(u) {
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

// Ne garde que les clés de thème valides (preset connu, couleurs hex, etc.).
export function sanitizeTheme(input = {}) {
  const t = {};
  if (PRESETS[input.preset]) t.preset = input.preset;
  for (const k of ["bg1", "bg2", "accent", "text"]) {
    if (HEX.test(input[k] || "")) t[k] = input[k];
  }
  if (["solid", "outline", "glass"].includes(input.btnFill)) t.btnFill = input.btnFill;
  if (["pill", "rounded", "square"].includes(input.btnShape)) t.btnShape = input.btnShape;
  if (FONTS[input.font]) t.font = input.font;
  if (typeof input.bgImage === "string" && (input.bgImage === "" || isHttpUrl(input.bgImage))) {
    t.bgImage = input.bgImage.slice(0, 500);
  }
  if (input.bgBlur !== undefined) t.bgBlur = Number(input.bgBlur) || 0;
  if (input.bgDim !== undefined) t.bgDim = Number(input.bgDim) || 0;
  if (input.titleBadge !== undefined) t.titleBadge = !!input.titleBadge;
  if (input.hideFooter !== undefined) t.hideFooter = !!input.hideFooter;
  return t;
}

export function validateButton({ label, url }) {
  if (!label || label.length > 80) return "Label is required (80 characters max)";
  if (!isHttpUrl(url)) return "Invalid URL (https://...)";
  return null;
}

// Champs optionnels d'un bouton (image de fond, animation).
export function sanitizeButtonExtras(body, patch) {
  if (body.image !== undefined) {
    const image = String(body.image || "").trim();
    if (image && !isHttpUrl(image)) return "Invalid image URL";
    patch.image = image.slice(0, 500) || null;
  }
  if (body.animation !== undefined) {
    patch.animation = ANIMATIONS[body.animation] ? body.animation : "none";
  }
  return null;
}
