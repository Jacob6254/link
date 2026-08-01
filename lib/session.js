// lib/session.js
// Jetons de session signés (HMAC-SHA256) via Web Crypto : utilisable à la fois
// dans le middleware (edge) et dans les routes API (node).
// Le cookie est un cookie de session (pas de maxAge) : il disparaît à la
// fermeture du navigateur. Une expiration serveur de 12 h sert de garde-fou.

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const enc = new TextEncoder();

async function hmacKey() {
  // AUTH_SECRET si défini, sinon dérivé d'ADMIN_PASSWORD (changer le mot de
  // passe admin invalide alors toutes les sessions, ce qui est voulu).
  const source = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    enc.encode("session-secret:" + source)
  );
  return crypto.subtle.importKey(
    "raw",
    digest,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toB64Url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64Url(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function signSession({ username, role }) {
  const payload = { username, role, exp: Date.now() + SESSION_TTL_MS };
  const data = toB64Url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(data));
  return `${data}.${toB64Url(sig)}`;
}

export async function verifySession(token) {
  try {
    const [data, sig] = String(token || "").split(".");
    if (!data || !sig) return null;
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      fromB64Url(sig),
      enc.encode(data)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64Url(data)));
    if (!payload.username || !payload.role) return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return { username: payload.username, role: payload.role };
  } catch {
    return null;
  }
}
