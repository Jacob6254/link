// lib/db.js
// Accès Supabase via l'API REST, uniquement côté serveur (service_role).

function headers() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function sb(path, init = {}) {
  const base = process.env.SUPABASE_URL;
  if (!base || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquantes");
  }
  const res = await fetch(`${base}/rest/v1${path}`, {
    ...init,
    cache: "no-store",
    headers: { ...headers(), ...(init.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase ${res.status}: ${body.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// true si l'erreur vient d'une table/colonne pas encore migrée côté Supabase.
export function isMissingSchema(err) {
  const msg = String(err?.message || "");
  return msg.includes("PGRST205") || msg.includes("42703") || msg.includes("PGRST204");
}

// Essaie chaque requête dans l'ordre et retient la première qui passe.
// Permet à l'app de fonctionner avant qu'une migration ne soit appliquée :
// on retombe sur une requête qui n'utilise pas les colonnes manquantes.
export async function sbFallback(paths, init) {
  for (let i = 0; i < paths.length; i++) {
    try {
      return await sb(paths[i], init);
    } catch (err) {
      if (!isMissingSchema(err) || i === paths.length - 1) throw err;
    }
  }
}

export function migrationError() {
  return Response.json(
    { error: "Database out of date: run supabase-schema.sql in Supabase > SQL Editor" },
    { status: 500 }
  );
}
