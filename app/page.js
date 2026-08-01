// app/page.js
// Page bio (accès protégé par le middleware : connexion requise).
// Les liens viennent de Supabase (gérés via /admin).
import { cookies } from "next/headers";
import { sb } from "@/lib/db";
import { verifySession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const token = (await cookies()).get("session")?.value;
  const session = token ? await verifySession(token) : null;

  let links = [];
  try {
    links = await sb("/links?select=slug,label&order=sort_order.asc,id.asc");
  } catch (err) {
    console.error(err);
  }

  return (
    <main className="bio">
      <div className="session-bar">
        {session?.role === "admin" && <a href="/admin">Admin</a>}
        <a href="/api/logout">Se déconnecter</a>
      </div>

      <header className="bio-head">
        <div className="avatar" aria-hidden="true">V</div>
        <h1>Votre Nom</h1>
        <p className="tagline">Une ligne sur vous</p>
      </header>

      <nav className="links" aria-label="Mes réseaux">
        {links.length === 0 && (
          <p className="empty">Aucun lien pour l&apos;instant. Ajoutez-les depuis /admin.</p>
        )}
        {links.map((link) => (
          <a key={link.slug} href={`/go/${link.slug}`} className="link-btn">
            {link.label}
          </a>
        ))}
      </nav>
    </main>
  );
}
