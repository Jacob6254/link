// app/admin/page.js
"use client";
// Interface d'administration : connexion, gestion des liens, statistiques.
import { useCallback, useEffect, useState } from "react";

export default function Admin() {
  const [authed, setAuthed] = useState(null); // null = en cours de vérification
  const [password, setPassword] = useState("");
  const [links, setLinks] = useState([]);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({ slug: "", label: "", web_url: "" });
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/links");
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    setAuthed(true);
    setLinks(await res.json());
    const s = await fetch("/api/admin/stats");
    if (s.ok) setStats(await s.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function login() {
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError("Mot de passe incorrect");
      return;
    }
    setPassword("");
    load();
  }

  async function createLink() {
    setError("");
    const res = await fetch("/api/admin/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erreur");
      return;
    }
    setForm({ slug: "", label: "", web_url: "" });
    load();
  }

  async function removeLink(id, label) {
    if (!confirm(`Supprimer « ${label} » ?`)) return;
    await fetch(`/api/admin/links/${id}`, { method: "DELETE" });
    load();
  }

  function copyGoUrl(slug) {
    navigator.clipboard.writeText(`${origin}/go/${slug}`);
  }

  if (authed === null) return <main className="admin"><p>Chargement…</p></main>;

  if (authed === false) {
    return (
      <main className="admin admin-login">
        <h1>Admin</h1>
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
        />
        <button onClick={login}>Se connecter</button>
        {error && <p className="error">{error}</p>}
      </main>
    );
  }

  return (
    <main className="admin">
      <h1>Mes liens</h1>

      <section className="card">
        <h2>Ajouter un lien</h2>
        <div className="form-grid">
          <input
            placeholder="slug (ex: instagram)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <input
            placeholder="Texte du bouton (ex: Mon Instagram)"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <input
            placeholder="URL web (ex: https://www.instagram.com/pseudo/)"
            value={form.web_url}
            onChange={(e) => setForm({ ...form, web_url: e.target.value })}
          />
          <button onClick={createLink}>Ajouter</button>
        </div>
        {error && <p className="error">{error}</p>}
        <p className="hint">
          Les deep-links Android/iOS sont générés automatiquement depuis l&apos;URL
          (Instagram, TikTok, YouTube, X, Snapchat, Facebook, Twitch, Pinterest,
          LinkedIn). Autre site : redirection web classique.
        </p>
      </section>

      <section className="card">
        <h2>Liens actifs</h2>
        {links.length === 0 && <p className="hint">Aucun lien.</p>}
        <ul className="link-list">
          {links.map((l) => (
            <li key={l.id}>
              <div>
                <strong>{l.label}</strong>
                <span className="mono"> /go/{l.slug}</span>
                <br />
                <span className="hint">{l.web_url}</span>
              </div>
              <div className="actions">
                <button onClick={() => copyGoUrl(l.slug)}>Copier le lien</button>
                <button className="danger" onClick={() => removeLink(l.id, l.label)}>
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
        <p className="hint">
          Lien à mettre dans votre bio Instagram : <span className="mono">{origin}</span> (la
          page avec tous les boutons) — ou un lien direct <span className="mono">{origin}/go/slug</span>.
        </p>
      </section>

      <section className="card">
        <h2>Statistiques</h2>
        {!stats && <p className="hint">Chargement…</p>}
        {stats && (
          <>
            <p>
              <strong>{stats.total}</strong> clics au total
              {stats.capped && " (fenêtre limitée aux 5000 derniers)"}
            </p>
            <table>
              <thead>
                <tr>
                  <th>Lien</th>
                  <th>Total</th>
                  <th>Android</th>
                  <th>iOS</th>
                  <th>Desktop</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.bySlug).map(([slug, s]) => (
                  <tr key={slug}>
                    <td className="mono">{slug}</td>
                    <td>{s.total}</td>
                    <td>{s.android}</td>
                    <td>{s.ios}</td>
                    <td>{s.desktop}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>14 derniers jours</h3>
            <ul className="days">
              {Object.entries(stats.byDay)
                .sort(([a], [b]) => (a < b ? 1 : -1))
                .map(([day, n]) => (
                  <li key={day}>
                    <span className="mono">{day}</span> — {n} clic{n > 1 ? "s" : ""}
                  </li>
                ))}
              {Object.keys(stats.byDay).length === 0 && (
                <li className="hint">Aucun clic récent.</li>
              )}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
