// app/admin/page.js
"use client";
// Interface d'administration : gestion des liens, profils, statistiques.
// L'accès est protégé par le middleware (session admin requise).
import { useCallback, useEffect, useState } from "react";

export default function Admin() {
  const [loaded, setLoaded] = useState(false);
  const [links, setLinks] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({ slug: "", label: "", web_url: "" });
  const [userForm, setUserForm] = useState({ username: "", password: "", role: "viewer" });
  const [error, setError] = useState("");
  const [userError, setUserError] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/links");
    if (res.status === 401 || res.status === 403) {
      window.location.href = "/login?next=/admin";
      return;
    }
    setLinks(await res.json());
    setLoaded(true);
    const [s, u] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch("/api/admin/users"),
    ]);
    if (s.ok) setStats(await s.json());
    if (u.ok) setUsers(await u.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  async function createUser() {
    setUserError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setUserError(data.error || "Erreur");
      return;
    }
    setUserForm({ username: "", password: "", role: "viewer" });
    load();
  }

  async function removeUser(id, username) {
    if (!confirm(`Supprimer le profil « ${username} » ?`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setUserError(data.error || "Erreur");
      return;
    }
    load();
  }

  function copyGoUrl(slug) {
    navigator.clipboard.writeText(`${origin}/go/${slug}`);
  }

  if (!loaded) return <main className="admin"><p>Chargement…</p></main>;

  return (
    <main className="admin">
      <div className="topbar">
        <h1>Mes liens</h1>
        <a className="logout" href="/api/logout">Se déconnecter</a>
      </div>

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
        <h2>Profils</h2>
        <div className="form-grid">
          <input
            placeholder="Identifiant (ex: paul)"
            autoComplete="off"
            value={userForm.username}
            onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
          />
          <input
            type="password"
            placeholder="Mot de passe (6 caractères min.)"
            autoComplete="new-password"
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
          />
          <select
            value={userForm.role}
            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
          >
            <option value="viewer">Visiteur — voit la page de liens</option>
            <option value="admin">Admin — accès à cette page</option>
          </select>
          <button onClick={createUser}>Créer le profil</button>
        </div>
        {userError && <p className="error">{userError}</p>}
        <ul className="link-list">
          {users.map((u) => (
            <li key={u.id}>
              <div>
                <strong>{u.username}</strong>{" "}
                <span className={u.role === "admin" ? "badge badge-admin" : "badge"}>
                  {u.role === "admin" ? "admin" : "visiteur"}
                </span>
              </div>
              <div className="actions">
                <button className="danger" onClick={() => removeUser(u.id, u.username)}>
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
        <p className="hint">
          Le compte de secours <span className="mono">admin</span> (mot de passe
          ADMIN_PASSWORD dans les variables d&apos;environnement) fonctionne toujours,
          même sans profil créé.
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
