// app/page.js
// Page bio publique : tous les liens, organisés par groupe.
import { sb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  let links = [];
  let groups = [];
  try {
    links = await sb("/links?select=slug,label,group_id&order=sort_order.asc,id.asc");
    groups = await sb("/groups?select=id,name&order=sort_order.asc,id.asc");
  } catch (err) {
    // Tables v2 pas encore migrées : on retombe sur la liste simple.
    console.error(err);
    if (links.length === 0) {
      try {
        links = await sb("/links?select=slug,label&order=sort_order.asc,id.asc");
      } catch (err2) {
        console.error(err2);
      }
    }
  }

  const ungrouped = links.filter((l) => !l.group_id);
  const sections = groups
    .map((g) => ({ ...g, links: links.filter((l) => l.group_id === g.id) }))
    .filter((g) => g.links.length > 0);

  return (
    <main className="bio">
      <header className="bio-head">
        <div className="avatar" aria-hidden="true">V</div>
        <h1>Votre Nom</h1>
        <p className="tagline">Une ligne sur vous</p>
      </header>

      <nav className="links" aria-label="Mes réseaux">
        {links.length === 0 && (
          <p className="empty">Aucun lien pour l&apos;instant.</p>
        )}

        {ungrouped.map((link) => (
          <a key={link.slug} href={`/${link.slug}`} className="link-btn">
            {link.label}
          </a>
        ))}

        {sections.map((g) => (
          <section key={g.id} className="link-group">
            <h2 className="group-title">{g.name}</h2>
            {g.links.map((link) => (
              <a key={link.slug} href={`/${link.slug}`} className="link-btn">
                {link.label}
              </a>
            ))}
          </section>
        ))}
      </nav>

      <footer className="bio-foot">
        <a href="/dashboard">Espace membre</a>
      </footer>
    </main>
  );
}
