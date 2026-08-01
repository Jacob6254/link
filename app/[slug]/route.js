// app/[slug]/route.js
// Liens courts à la racine : allmysocials.us/insta
// Les pages statiques (/login, /dashboard, ...) ont priorité sur cette route.
import { handleGoLink } from "@/lib/golink";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { slug } = await params;
  return handleGoLink(request, slug);
}
