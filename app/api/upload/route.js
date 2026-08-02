// app/api/upload/route.js
// Upload d'images (avatar, fond de page, image de bouton) vers Supabase
// Storage, bucket public "media". Le bucket est créé automatiquement au
// premier upload.
import { requireUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

const BUCKET = "media";
const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo
const TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function storageHeaders(extra = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function createBucket(base) {
  await fetch(`${base}/storage/v1/bucket`, {
    method: "POST",
    headers: storageHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
}

export async function POST(request) {
  const session = await requireUser(request);
  if (!session) return unauthorized();

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "No file received" }, { status: 400 });
  }
  const ext = TYPES[file.type];
  if (!ext) {
    return Response.json(
      { error: "Unsupported format (JPEG, PNG, WebP or GIF only)" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: "File too large (5 MB max)" }, { status: 400 });
  }

  const base = process.env.SUPABASE_URL;
  const path = `${session.username}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  const bytes = await file.arrayBuffer();

  async function put() {
    return fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: storageHeaders({ "Content-Type": file.type }),
      body: bytes,
    });
  }

  let res = await put();
  if (res.status === 400 || res.status === 404) {
    // Bucket probablement absent : on le crée puis on réessaie une fois.
    await createBucket(base);
    res = await put();
  }
  if (!res.ok) {
    console.error("Upload Storage:", res.status, await res.text().catch(() => ""));
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }

  return Response.json({
    url: `${base}/storage/v1/object/public/${BUCKET}/${path}`,
  });
}
