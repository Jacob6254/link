// app/api/logout/route.js
// Déconnexion : supprime le cookie de session puis renvoie sur /login.
// En GET pour pouvoir être un simple lien <a href="/api/logout">.
import { NextResponse } from "next/server";

export async function GET(request) {
  const res = NextResponse.redirect(new URL("/login", request.url));
  res.cookies.set("session", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
