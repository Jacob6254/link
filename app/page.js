// app/page.js
// Page bio publique. Les liens viennent de Supabase (gérés via /admin).
import { sb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  let links = [];
  try {
    links = await sb("/links?select=slug,label&order=sort_order.asc,id.asc");
  } catch (err) {
    console.error(err);
  }

  return (
    <main className="bio">
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
