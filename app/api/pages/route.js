// app/api/pages/route.js
// Pages bio : chaque profil gère les siennes ; les admins voient tout.
import { sb, sbFallback, isMissingSchema, migrationError } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";
import { RESERVED_SLUGS } from "@/lib/golink";
import { slugTaken } from "@/lib/slugs";
import { DEFAULT_THEME } from "@/lib/pagerender";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = await requireUser(request);
  if (!session) return unauthorized();
  const filter =
    session.role === "admin" ? "" : `&owner=eq.${encodeURIComponent(session.username)}`;
  try {
    const pages = await sbFallback([
      `/pages?select=id,slug,title,tagline,avatar,owner,discord_id&order=id.asc${filter}`,
      `/pages?select=id,slug,title,tagline,avatar,owner&order=id.asc${filter}`,
    ]);
    return Response.json(pages);
  } catch (err) {
    if (isMissingSchema(err)) return migrationError();
    throw err;
  }
}

export async function POST(request) {
  const session = await requireUser(request);
  if (!session) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const slug = String(body.slug || "").trim().toLowerCase();
  const title = String(body.title || "").trim();

  if (!/^[a-z0-9-]{1,50}$/.test(slug)) {
    return Response.json(
      { error: "Invalid slug (lowercase letters, digits, hyphens)" },
      { status: 400 }
    );
  }
  if (RESERVED_SLUGS.includes(slug)) {
    return Response.json({ error: `"${slug}" is reserved by the site` }, { status: 400 });
  }
  if (!title || title.length > 60) {
    return Response.json({ error: "Title is required (60 characters max)" }, { status: 400 });
  }

  try {
    if (await slugTaken(slug)) {
      return Response.json({ error: "That slug is already taken" }, { status: 409 });
    }
    const created = await sb("/pages", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        slug,
        title,
        owner: session.username,
        discord_id: String(body.discord_id || "").trim().slice(0, 32) || null,
        theme: DEFAULT_THEME,
      }),
    });
    return Response.json(created[0], { status: 201 });
  } catch (err) {
    if (isMissingSchema(err)) return migrationError();
    const msg = String(err.message || "");
    if (msg.includes("23505") || msg.includes("duplicate")) {
      return Response.json({ error: "That slug is already taken" }, { status: 409 });
    }
    console.error(err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
