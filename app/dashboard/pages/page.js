// app/dashboard/pages/page.js
"use client";
// Liste des pages bio : création + accès à l'éditeur.
import { useCallback, useEffect, useState } from "react";

export default function PagesPage() {
  const [pages, setPages] = useState(null);
  const [form, setForm] = useState({ slug: "", title: "" });
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const load = useCallback(async () => {
    const res = await fetch("/api/pages");
    if (res.status === 401) {
      window.location.href = "/login?next=/dashboard/pages";
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to load");
      setPages([]);
      return;
    }
    setPages(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createPage() {
    setError("");
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Something went wrong");
    window.location.href = `/dashboard/pages/${data.id}`;
  }

  async function removePage(id, title) {
    if (!confirm(`Delete page “${title}” and all its buttons?`)) return;
    await fetch(`/api/pages/${id}`, { method: "DELETE" });
    load();
  }

  function copyUrl(slug) {
    navigator.clipboard.writeText(`${origin}/${slug}`);
    setCopied(slug);
    setTimeout(() => setCopied(null), 1500);
  }

  if (pages === null) return <main className="panel"><p className="hint">Loading…</p></main>;

  return (
    <main className="panel">
      <h1>My pages</h1>

      <section className="card">
        <h2>Create a page</h2>
        <div className="form-row">
          <input
            placeholder="slug (e.g. yourname)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <input
            placeholder="Page title (e.g. Your Name)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && createPage()}
          />
          <button onClick={createPage}>Create page</button>
        </div>
        {error && <p className="error">{error}</p>}
        <p className="hint">
          Your link-in-bio page will live at{" "}
          <span className="mono">{origin || ""}/slug</span> — add buttons, pick a
          theme and customize everything in the editor.
        </p>
      </section>

      <section className="card">
        <h2>Your pages <span className="count">{pages.length}</span></h2>
        {pages.length === 0 && <p className="hint">No pages yet — create your first one above.</p>}
        <ul className="link-list">
          {pages.map((p) => (
            <li key={p.id}>
              <div className="link-info">
                <strong>{p.title}</strong>
                <span className="mono">/{p.slug}</span>
                {p.owner && <span className="badge badge-dim">{p.owner}</span>}
                {p.tagline && (
                  <>
                    <br />
                    <span className="hint">{p.tagline}</span>
                  </>
                )}
              </div>
              <div className="actions">
                <button className="ghost" onClick={() => copyUrl(p.slug)}>
                  {copied === p.slug ? "Copied ✓" : "Copy URL"}
                </button>
                <a className="btn-link" href={`/dashboard/pages/${p.id}`}>
                  <button>Edit</button>
                </a>
                <button className="danger" onClick={() => removePage(p.id, p.title)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
