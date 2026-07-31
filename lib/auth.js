// lib/auth.js
// Auth minimaliste mono-utilisateur : cookie httpOnly contenant un hash
// dérivé du mot de passe (le mot de passe lui-même n'est jamais dans le cookie).
import { createHash } from "crypto";

export function adminToken() {
  return createHash("sha256")
    .update("admin-session:" + (process.env.ADMIN_PASSWORD || ""))
    .digest("hex");
}

export function isAdmin(request) {
  if (!process.env.ADMIN_PASSWORD) return false;
  const cookie = request.cookies.get("admin")?.value;
  return cookie === adminToken();
}

export function unauthorized() {
  return Response.json({ error: "Non autorisé" }, { status: 401 });
}
