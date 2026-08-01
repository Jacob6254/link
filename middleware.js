// middleware.js
// La page bio (/), les liens courts (/slug, /go/slug) et /login sont publics.
// /dashboard et les API exigent une session ; les profils (gestion des
// comptes) exigent le rôle "admin".
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/session";

const PUBLIC_API = ["/api/login", "/api/logout"];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_API.includes(pathname)) return NextResponse.next();

  const token = request.cookies.get("session")?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const needsAdmin =
    pathname.startsWith("/api/admin") || pathname.startsWith("/dashboard/profiles");
  if (needsAdmin && session.role !== "admin") {
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Accès réservé aux admins" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Seules les zones connectées passent par le middleware.
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/:path*"],
};
