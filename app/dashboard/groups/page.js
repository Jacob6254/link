// app/dashboard/groups/page.js
"use client";
// Gestion des groupes (sections de la page bio) : créer, renommer, supprimer.
import { useCallback, useEffect, useState } from "react";

export default function GroupsPage() {
  const [groups, setGroups] = useState(null);
  const [links, setLinks] = useState([]);
  const [name, setName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [g, l] = await Promise.all([fetch("/api/groups"), fetch("/api/links")]);
    if (g.status === 401) {
      window.location.href = "/login?next=/dashboard/groups";
      return;
    }
    setGroups(g.ok ? await g.json() : []);
    setLinks(l.ok ? await l.json() : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createGroup() {
    setError("");
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Erreur");
    setName("");
    load();
  }

  async function rename(id) {
    setError("");
    const res = await fetch(`/api/groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Erreur");
    setEditId(null);
    load();
  }

  async function remove(id, gname) {
    const n = links.filter((l) => l.group_id === id).length;
    const extra = n > 0 ? ` Les ${n} lien(s) du groupe redeviendront « sans groupe ».` : "";
    if (!confirm(`Supprimer le groupe « ${gname} » ?${extra}`)) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    load();
  }

  const countIn = (id) => links.filter((l) => l.group_id === id).length;

  if (groups === null) return <main className="panel"><p className="hint">Chargement…</p></main>;

  return (
    <main className="panel">
      <h1>Groupes</h1>

      <section className="card">
        <h2>Créer un groupe</h2>
        <div className="form-row">
          <input
            placeholder="Nom du groupe (ex: Réseaux sociaux)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createGroup()}
          />
          <button onClick={createGroup}>Créer</button>
        </div>
        {error && <p className="error">{error}</p>}
        <p className="hint">
          Les groupes forment des sections sur la page bio : les liens d&apos;un même
          groupe s&apos;affichent ensemble, sous le nom du groupe.
        </p>
      </section>

      <section className="card">
        <h2>Mes groupes <span className="count">{groups.length}</span></h2>
        {groups.length === 0 && <p className="hint">Aucun groupe pour l&apos;instant.</p>}
        <ul className="link-list">
          {groups.map((g) =>
            editId === g.id ? (
              <li key={g.id} className="editing">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && rename(g.id)}
                />
                <div className="actions">
                  <button onClick={() => rename(g.id)}>Enregistrer</button>
                  <button className="ghost" onClick={() => setEditId(null)}>Annuler</button>
                </div>
              </li>
            ) : (
              <li key={g.id}>
                <div className="link-info">
                  <strong>{g.name}</strong>
                  <span className="badge">{countIn(g.id)} lien{countIn(g.id) > 1 ? "s" : ""}</span>
                </div>
                <div className="actions">
                  <button
                    className="ghost"
                    onClick={() => { setEditId(g.id); setEditName(g.name); }}
                  >
                    Renommer
                  </button>
                  <button className="danger" onClick={() => remove(g.id, g.name)}>
                    Supprimer
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      </section>
    </main>
  );
}
