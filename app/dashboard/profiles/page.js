// app/dashboard/profiles/page.js
"use client";
// Gestion des profils (admins uniquement — le middleware bloque les autres).
import { useCallback, useEffect, useState } from "react";

export default function ProfilesPage() {
  const [users, setUsers] = useState(null);
  const [form, setForm] = useState({ username: "", password: "", role: "viewer" });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.status === 401 || res.status === 403) {
      window.location.href = "/dashboard";
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erreur");
      setUsers([]);
      return;
    }
    setUsers(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createUser() {
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Erreur");
    setForm({ username: "", password: "", role: "viewer" });
    load();
  }

  async function removeUser(id, username) {
    if (!confirm(`Supprimer le profil « ${username} » ? Ses liens resteront en ligne.`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erreur");
      return;
    }
    load();
  }

  if (users === null) return <main className="panel"><p className="hint">Chargement…</p></main>;

  return (
    <main className="panel">
      <h1>Profils</h1>

      <section className="card">
        <h2>Créer un profil</h2>
        <div className="form-row">
          <input
            placeholder="Identifiant (ex: paul)"
            autoComplete="off"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            type="password"
            placeholder="Mot de passe (6 caractères min.)"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div className="form-row">
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="viewer">Membre — gère ses liens et ses stats</option>
            <option value="admin">Admin — gère aussi les profils</option>
          </select>
          <button onClick={createUser}>Créer le profil</button>
        </div>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card">
        <h2>Profils existants <span className="count">{users.length}</span></h2>
        {users.length === 0 && <p className="hint">Aucun profil créé.</p>}
        <ul className="link-list">
          {users.map((u) => (
            <li key={u.id}>
              <div className="link-info">
                <span className="user-avatar" aria-hidden="true">
                  {u.username[0].toUpperCase()}
                </span>{" "}
                <strong>{u.username}</strong>
                <span className={u.role === "admin" ? "badge badge-admin" : "badge"}>
                  {u.role === "admin" ? "admin" : "membre"}
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
          ADMIN_PASSWORD) fonctionne toujours, même sans profil créé.
        </p>
      </section>
    </main>
  );
}
