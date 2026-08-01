// app/api/admin/users/route.js
// Gestion des profils (admins uniquement).
import { sb } from "@/lib/db";
import { hashPassword, requireAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!(await requireAdmin(request))) return unauthorized();
  try {
    const users = await sb("/users?select=id,username,role,created_at&order=id.asc");
    return Response.json(users);
  } catch (err) {
    if (String(err.message || "").includes("PGRST205")) {
      return Response.json(
        { error: "Table users absente : exécutez le bloc « users » de supabase-schema.sql" },
        { status: 500 }
      );
    }
    throw err;
  }
}

export async function POST(request) {
  if (!(await requireAdmin(request))) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = body.role === "admin" ? "admin" : "viewer";

  if (!/^[a-z0-9_-]{3,30}$/.test(username)) {
    return Response.json(
      { error: "Identifiant invalide (3-30 caractères : lettres, chiffres, - ou _)" },
      { status: 400 }
    );
  }
  if (username === "admin") {
    return Response.json(
      { error: "« admin » est réservé au compte de secours" },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return Response.json(
      { error: "Mot de passe trop court (6 caractères minimum)" },
      { status: 400 }
    );
  }

  try {
    const created = await sb("/users", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ username, password_hash: hashPassword(password), role }),
    });
    const { id, created_at } = created[0];
    return Response.json({ id, username, role, created_at }, { status: 201 });
  } catch (err) {
    const msg = String(err.message || "");
    if (msg.includes("23505") || msg.includes("duplicate")) {
      return Response.json({ error: "Cet identifiant existe déjà" }, { status: 409 });
    }
    console.error(err);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
