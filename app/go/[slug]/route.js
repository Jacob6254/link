// app/go/[slug]/route.js
// Compatibilité : les anciens liens /go/slug déjà partagés continuent de marcher.
import { handleGoLink } from "@/lib/golink";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { slug } = await params;
  const res = await handleGoLink(request, slug);
  return res || new Response("Link not found", { status: 404 });
}
