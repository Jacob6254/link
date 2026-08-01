// middleware.js
// Protège tout le site : sans session valide -> redirection vers /login.
// Les pages /admin et les API /api/admin exigent en plus le rôle "admin".
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/api/login", "/api/logout"];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const token = request.cookies.get("session")?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const needsAdmin =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/admin");
  if (needsAdmin && session.role !== "admin") {
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Accès réservé aux admins" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Tout sauf les assets Next et le favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
