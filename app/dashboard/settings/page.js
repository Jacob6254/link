// app/dashboard/settings/page.js
"use client";
// Réglages du site (admins uniquement) : destination de la racine du domaine.
import { useCallback, useEffect, useState } from "react";

export default function SettingsPage() {
  const [links, setLinks] = useState([]);
  const [rootRedirect, setRootRedirect] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const load = useCallback(async () => {
    const [s, l] = await Promise.all([
      fetch("/api/admin/settings"),
      fetch("/api/links"),
    ]);
    if (s.status === 401 || s.status === 403) {
      window.location.href = "/dashboard";
      return;
    }
    if (s.ok) setRootRedirect((await s.json()).root_redirect || "");
    if (l.ok) setLinks(await l.json());
    else {
      const data = await l.json().catch(() => ({}));
      setError(data.error || "Erreur de chargement");
    }
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(value) {
    setError("");
    setSaved(false);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root_redirect: value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || "Erreur");
    setRootRedirect(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!loaded) return <main className="panel"><p className="hint">Chargement…</p></main>;

  const target = links.find((l) => l.slug === rootRedirect);

  return (
    <main className="panel">
      <h1>Réglages</h1>

      <section className="card">
        <h2>Destination de la racine</h2>
        <p className="hint setting-desc">
          Ce que voit quelqu&apos;un qui ouvre <span className="mono">{origin}</span> tout
          court, sans slug. Choisissez un de vos liens : la redirection utilise le
          même deep-link que d&apos;habitude et le clic est compté dans vos stats.
        </p>
        <div className="form-row">
          <select value={rootRedirect} onChange={(e) => save(e.target.value)}>
            <option value="">Aucune — afficher une page « rien par ici »</option>
            {links.map((l) => (
              <option key={l.id} value={l.slug}>
                {l.label} (/{l.slug})
              </option>
            ))}
          </select>
        </div>
        {saved && <p className="saved">Enregistré ✓</p>}
        {error && <p className="error">{error}</p>}
        {target && (
          <p className="hint">
            <span className="mono">{origin}</span> redirige vers{" "}
            <strong>{target.label}</strong> — <span className="hint">{target.web_url}</span>
          </p>
        )}
        {links.length === 0 && (
          <p className="hint">Créez d&apos;abord un lien dans « Mes liens ».</p>
        )}
      </section>
    </main>
  );
}
