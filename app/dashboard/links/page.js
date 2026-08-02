// app/dashboard/links/page.js
"use client";
// Gestion de ses liens : création, édition, suppression, groupe.
import { useCallback, useEffect, useState } from "react";

const EMPTY = { slug: "", label: "", web_url: "", group_id: "" };

export default function LinksPage() {
  const [links, setLinks] = useState(null);
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const load = useCallback(async () => {
    const [l, g] = await Promise.all([fetch("/api/links"), fetch("/api/groups")]);
    if (l.status === 401) {
      window.location.href = "/login?next=/dashboard/links";
      return;
    }
    if (!l.ok) {
      const data = await l.json().catch(() => ({}));
      setError(data.error || "Failed to load");
      setLinks([]);
    } else {
      setLinks(await l.json());
    }
    setGroups(g.ok ? await g.json() : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createLink() {
    setError("");
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, group_id: form.group_id || null }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Something went wrong");
    setForm(EMPTY);
    load();
  }

  async function saveEdit(id) {
    setError("");
    const res = await fetch(`/api/links/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, group_id: editForm.group_id || null }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Something went wrong");
    setEditId(null);
    load();
  }

  async function removeLink(id, label) {
    if (!confirm(`Delete “${label}”?`)) return;
    await fetch(`/api/links/${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(l) {
    setEditId(l.id);
    setEditForm({
      slug: l.slug, label: l.label, web_url: l.web_url,
      group_id: l.group_id ? String(l.group_id) : "",
    });
  }

  function copyUrl(slug) {
    navigator.clipboard.writeText(`${origin}/${slug}`);
    setCopied(slug);
    setTimeout(() => setCopied(null), 1500);
  }

  if (links === null) return <main className="panel"><p className="hint">Loading…</p></main>;

  // Liens rangés par groupe, "sans groupe" en dernier.
  const sections = [
    ...groups
      .map((g) => ({ key: g.id, name: g.name, items: links.filter((l) => l.group_id === g.id) }))
      .filter((s) => s.items.length > 0),
    {
      key: "none",
      name: "Ungrouped",
      items: links.filter((l) => !l.group_id || !groups.some((g) => g.id === l.group_id)),
    },
  ].filter((s) => s.items.length > 0);

  return (
    <main className="panel">
      <h1>My links</h1>

      <section className="card">
        <h2>Add a link</h2>
        <div className="form-row">
          <input
            placeholder="slug (e.g. insta)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <input
            placeholder="Button label"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
        </div>
        <div className="form-row">
          <input
            placeholder="Destination URL (e.g. https://www.instagram.com/name/)"
            value={form.web_url}
            onChange={(e) => setForm({ ...form, web_url: e.target.value })}
          />
          <select
            value={form.group_id}
            onChange={(e) => setForm({ ...form, group_id: e.target.value })}
          >
            <option value="">No group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <button onClick={createLink}>Add link</button>
        {error && <p className="error">{error}</p>}
        <p className="hint">
          Your short link will be <span className="mono">{origin || ""}/slug</span> —
          Android and iOS deep links are generated automatically (Instagram,
          TikTok, YouTube, X, Snapchat and more).
        </p>
      </section>

      <section className="card">
        <h2>Active links <span className="count">{links.length}</span></h2>
        {links.length === 0 && <p className="hint">No links yet.</p>}
        {sections.map((section) => (
          <div className="link-section" key={section.key}>
            <h3 className="section-title">
              {section.name} <span className="section-count">{section.items.length}</span>
            </h3>
            <ul className="link-list">
              {section.items.map((l) =>
                editId === l.id ? (
                  <li key={l.id} className="editing">
                    <div className="form-row">
                      <input
                        value={editForm.slug}
                        onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                      />
                      <input
                        value={editForm.label}
                        onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                      />
                    </div>
                    <div className="form-row">
                      <input
                        value={editForm.web_url}
                        onChange={(e) => setEditForm({ ...editForm, web_url: e.target.value })}
                      />
                      <select
                        value={editForm.group_id}
                        onChange={(e) => setEditForm({ ...editForm, group_id: e.target.value })}
                      >
                        <option value="">No group</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="actions">
                      <button onClick={() => saveEdit(l.id)}>Save</button>
                      <button className="ghost" onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  </li>
                ) : (
                  <li key={l.id}>
                    <div className="link-info">
                      <strong>{l.label}</strong>
                      <span className="mono">/{l.slug}</span>
                      {l.owner && <span className="badge badge-dim">{l.owner}</span>}
                      <br />
                      <span className="hint">{l.web_url}</span>
                    </div>
                    <div className="actions">
                      <button className="ghost" onClick={() => copyUrl(l.slug)}>
                        {copied === l.slug ? "Copied ✓" : "Copy"}
                      </button>
                      <button className="ghost" onClick={() => startEdit(l)}>Edit</button>
                      <button className="danger" onClick={() => removeLink(l.id, l.label)}>
                        Delete
                      </button>
                    </div>
                  </li>
                )
              )}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
