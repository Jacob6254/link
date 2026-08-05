// app/dashboard/profiles/page.js
"use client";
// Gestion des profils (admins uniquement — le middleware bloque les autres).
import { useCallback, useEffect, useState } from "react";
import { Loader } from "../ui";
import { IconPlus, IconTrash, IconUsers } from "../icons";

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
      setError(data.error || "Failed to load");
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
    if (!res.ok) return setError(data.error || "Something went wrong");
    setForm({ username: "", password: "", role: "viewer" });
    load();
  }

  async function removeUser(id, username) {
    if (!confirm(`Delete profile “${username}”? Their links stay online.`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong");
      return;
    }
    load();
  }

  if (users === null) return <main className="panel"><Loader label="Loading profiles" /></main>;

  return (
    <main className="panel">
      <h1><span className="ico-box"><IconUsers size={18} /></span>Profiles</h1>

      <section className="card">
        <h2><span className="ico-box"><IconPlus size={15} /></span>Create a profile</h2>
        <div className="form-row">
          <input
            placeholder="Username (e.g. paul)"
            autoComplete="off"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password (6 characters min.)"
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
            <option value="viewer">Member — manages their own links and stats</option>
            <option value="admin">Admin — also manages profiles</option>
          </select>
          <button onClick={createUser}>Create profile</button>
        </div>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card">
        <h2>Existing profiles <span className="count">{users.length}</span></h2>
        {users.length === 0 && <p className="hint">No profiles yet.</p>}
        <ul className="link-list">
          {users.map((u) => (
            <li key={u.id}>
              <div className="link-info">
                <span className="user-avatar" aria-hidden="true">
                  {u.username[0].toUpperCase()}
                </span>{" "}
                <strong>{u.username}</strong>
                <span className={u.role === "admin" ? "badge badge-admin" : "badge"}>
                  {u.role === "admin" ? "admin" : "member"}
                </span>
              </div>
              <div className="actions">
                <button className="danger" onClick={() => removeUser(u.id, u.username)}>
                  <IconTrash className="ico" size={14} />Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
        <p className="hint">
          The fallback <span className="mono">admin</span> account (password from
          ADMIN_PASSWORD) always works, even with no profile created.
        </p>
      </section>
    </main>
  );
}
