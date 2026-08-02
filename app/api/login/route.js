// app/api/login/route.js
// Connexion par identifiant + mot de passe.
// - "admin" + ADMIN_PASSWORD (env) : compte de secours toujours disponible.
// - Sinon : recherche dans la table Supabase "users".
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { sb } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { signSession } from "@/lib/session";

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 }
    );
  }

  let role = null;

  if (
    username === "admin" &&
    process.env.ADMIN_PASSWORD &&
    safeEqual(password, process.env.ADMIN_PASSWORD)
  ) {
    role = "admin";
  } else {
    try {
      const rows = await sb(
        `/users?username=eq.${encodeURIComponent(username)}&select=password_hash,role&limit=1`
      );
      const user = rows?.[0];
      if (user && verifyPassword(password, user.password_hash)) {
        role = user.role;
      }
    } catch (err) {
      // Table "users" pas encore créée dans Supabase : on continue, seul le
      // compte de secours "admin" peut alors se connecter.
      if (String(err.message || "").includes("PGRST205")) {
        console.warn("Table users absente — exécutez supabase-schema.sql");
      } else {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
      }
    }
  }

  if (!role) {
    return NextResponse.json(
      { error: "Incorrect username or password" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true, role });
  res.cookies.set("session", await signSession({ username, role }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    // Pas de maxAge : cookie de session -> reconnexion à chaque
    // fermeture du navigateur.
  });
  return res;
}
