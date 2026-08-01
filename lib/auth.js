// lib/auth.js
// Côté serveur (node) : hash des mots de passe et helpers d'autorisation
// pour les routes API. La vérification de session elle-même est dans
// lib/session.js (partagée avec le middleware).
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { verifySession } from "./session";

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return test.length === expected.length && timingSafeEqual(test, expected);
}

export async function getSession(request) {
  const token = request.cookies.get("session")?.value;
  return token ? verifySession(token) : null;
}

// Retourne la session si l'utilisateur est connecté, sinon null.
export async function requireUser(request) {
  return getSession(request);
}

// Retourne la session si l'utilisateur est admin, sinon null.
export async function requireAdmin(request) {
  const session = await getSession(request);
  return session?.role === "admin" ? session : null;
}

export function unauthorized() {
  return Response.json({ error: "Non autorisé" }, { status: 401 });
}
