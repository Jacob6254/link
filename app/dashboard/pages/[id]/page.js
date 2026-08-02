// app/dashboard/pages/[id]/page.js
"use client";
// Éditeur de page bio : identité, thème (presets + personnalisation),
// boutons (ajout, renommage, réordonnancement) — avec aperçu en direct.
// L'aperçu utilise le MÊME moteur de rendu que la page publique (iframe).
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { PRESETS, renderPageHTML, resolveTheme } from "@/lib/pagerender";

const NEW_BUTTON = { label: "", url: "" };

export default function PageEditor({ params }) {
  const { id } = use(params);
  const [page, setPage] = useState(null);
  const [buttons, setButtons] = useState([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [newBtn, setNewBtn] = useState(NEW_BUTTON);
  const [editBtnId, setEditBtnId] = useState(null);
  const [editBtn, setEditBtn] = useState(NEW_BUTTON);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/pages/${id}`);
    if (res.status === 401) {
      window.location.href = "/login?next=/dashboard/pages";
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to load");
      return;
    }
    const data = await res.json();
    const { buttons: btns, ...p } = data;
    setPage(p);
    setButtons(btns || []);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const previewHtml = useMemo(
    () => (page ? renderPageHTML(page, buttons, { preview: true }) : ""),
    [page, buttons]
  );

  function patchLocal(changes) {
    setPage((p) => ({ ...p, ...changes }));
    setDirty(true);
    setSaved(false);
  }

  function patchTheme(changes) {
    setPage((p) => ({ ...p, theme: { ...p.theme, ...changes } }));
    setDirty(true);
    setSaved(false);
  }

  function applyPreset(key) {
    // Un preset remet à zéro les personnalisations pour repartir propre.
    setPage((p) => ({ ...p, theme: { preset: key } }));
    setDirty(true);
    setSaved(false);
  }

  async function savePage() {
    setError("");
    const res = await fetch(`/api/pages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: page.slug,
        title: page.title,
        tagline: page.tagline || "",
        avatar: page.avatar || "",
        theme: page.theme,
      }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Something went wrong");
    setPage((p) => ({ ...p, ...data }));
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function addButton() {
    setError("");
    const res = await fetch(`/api/pages/${id}/buttons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newBtn, sort_order: buttons.length }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Something went wrong");
    setNewBtn(NEW_BUTTON);
    setButtons((b) => [...b, data]);
  }

  async function saveButton(bid) {
    setError("");
    const res = await fetch(`/api/buttons/${bid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editBtn),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Something went wrong");
    setButtons((btns) => btns.map((b) => (b.id === bid ? { ...b, ...data } : b)));
    setEditBtnId(null);
  }

  async function removeButton(bid, label) {
    if (!confirm(`Delete button “${label}”?`)) return;
    await fetch(`/api/buttons/${bid}`, { method: "DELETE" });
    setButtons((btns) => btns.filter((b) => b.id !== bid));
  }

  async function moveButton(index, dir) {
    const next = [...buttons];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setButtons(next);
    // Persiste les nouvelles positions.
    await Promise.all(
      next.map((b, i) =>
        fetch(`/api/buttons/${b.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: i }),
        })
      )
    );
  }

  if (error && !page) return <main className="panel"><p className="error">{error}</p></main>;
  if (!page) return <main className="panel"><p className="hint">Loading…</p></main>;

  const theme = resolveTheme(page.theme);

  return (
    <main className="panel editor">
      <div className="editor-head">
        <h1>
          <a className="back" href="/dashboard/pages">←</a> {page.title}
          <a
            className="mono page-url"
            href={`/${page.slug}`}
            target="_blank"
            rel="noreferrer"
          >
            {origin}/{page.slug} ↗
          </a>
        </h1>
        <div className="editor-save">
          {saved && <span className="saved">Saved ✓</span>}
          {dirty && <span className="hint">Unsaved changes</span>}
          <button onClick={savePage}>Save</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="editor-cols">
        <div className="editor-controls">
          <section className="card">
            <h2>Page</h2>
            <label className="field">
              <span>Title</span>
              <input
                value={page.title || ""}
                onChange={(e) => patchLocal({ title: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Bio / tagline</span>
              <input
                placeholder="A line about you"
                value={page.tagline || ""}
                onChange={(e) => patchLocal({ tagline: e.target.value })}
              />
            </label>
            <div className="form-row">
              <label className="field">
                <span>Slug</span>
                <input
                  value={page.slug || ""}
                  onChange={(e) => patchLocal({ slug: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Avatar (emoji or image URL)</span>
                <input
                  placeholder="😎 or https://…/me.jpg"
                  value={page.avatar || ""}
                  onChange={(e) => patchLocal({ avatar: e.target.value })}
                />
              </label>
            </div>
          </section>

          <section className="card">
            <h2>Theme</h2>
            <div className="preset-grid">
              {Object.entries(PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  type="button"
                  className={
                    (page.theme?.preset || "midnight") === key
                      ? "preset active"
                      : "preset"
                  }
                  style={{ background: `linear-gradient(150deg, ${p.bg1}, ${p.bg2})` }}
                  onClick={() => applyPreset(key)}
                >
                  <span className="preset-dot" style={{ background: p.accent }} />
                  <span className="preset-name" style={{ color: p.text }}>{p.name}</span>
                </button>
              ))}
            </div>

            <div className="theme-controls">
              <label className="field color-field">
                <span>Accent</span>
                <input
                  type="color"
                  value={theme.accent}
                  onChange={(e) => patchTheme({ accent: e.target.value })}
                />
              </label>
              <label className="field color-field">
                <span>Background 1</span>
                <input
                  type="color"
                  value={theme.bg1}
                  onChange={(e) => patchTheme({ bg1: e.target.value })}
                />
              </label>
              <label className="field color-field">
                <span>Background 2</span>
                <input
                  type="color"
                  value={theme.bg2}
                  onChange={(e) => patchTheme({ bg2: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Button shape</span>
                <select
                  value={theme.btnShape}
                  onChange={(e) => patchTheme({ btnShape: e.target.value })}
                >
                  <option value="pill">Pill</option>
                  <option value="rounded">Rounded</option>
                  <option value="square">Square</option>
                </select>
              </label>
              <label className="field">
                <span>Button style</span>
                <select
                  value={theme.btnFill}
                  onChange={(e) => patchTheme({ btnFill: e.target.value })}
                >
                  <option value="solid">Solid</option>
                  <option value="outline">Outline</option>
                  <option value="glass">Glass</option>
                </select>
              </label>
            </div>
            <p className="hint">Theme and page info are applied when you hit Save.</p>
          </section>

          <section className="card">
            <h2>Buttons <span className="count">{buttons.length}</span></h2>
            <div className="form-row">
              <input
                placeholder="Button label (e.g. My Instagram)"
                value={newBtn.label}
                onChange={(e) => setNewBtn({ ...newBtn, label: e.target.value })}
              />
              <input
                placeholder="https://…"
                value={newBtn.url}
                onChange={(e) => setNewBtn({ ...newBtn, url: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addButton()}
              />
              <button onClick={addButton}>Add</button>
            </div>
            <p className="hint">
              Buttons open the native app when possible (Instagram, TikTok,
              YouTube…) and every click is tracked in Analytics.
            </p>

            <ul className="link-list">
              {buttons.map((b, i) =>
                editBtnId === b.id ? (
                  <li key={b.id} className="editing">
                    <div className="form-row">
                      <input
                        value={editBtn.label}
                        onChange={(e) => setEditBtn({ ...editBtn, label: e.target.value })}
                      />
                      <input
                        value={editBtn.url}
                        onChange={(e) => setEditBtn({ ...editBtn, url: e.target.value })}
                      />
                    </div>
                    <div className="actions">
                      <button onClick={() => saveButton(b.id)}>Save</button>
                      <button className="ghost" onClick={() => setEditBtnId(null)}>Cancel</button>
                    </div>
                  </li>
                ) : (
                  <li key={b.id}>
                    <div className="link-info">
                      <strong>{b.label}</strong>
                      <br />
                      <span className="hint">{b.url}</span>
                    </div>
                    <div className="actions">
                      <button className="ghost move" disabled={i === 0}
                        onClick={() => moveButton(i, -1)} title="Move up">↑</button>
                      <button className="ghost move" disabled={i === buttons.length - 1}
                        onClick={() => moveButton(i, 1)} title="Move down">↓</button>
                      <button className="ghost"
                        onClick={() => { setEditBtnId(b.id); setEditBtn({ label: b.label, url: b.url }); }}>
                        Edit
                      </button>
                      <button className="danger" onClick={() => removeButton(b.id, b.label)}>
                        Delete
                      </button>
                    </div>
                  </li>
                )
              )}
            </ul>
          </section>
        </div>

        <div className="editor-preview">
          <div className="phone">
            <iframe title="Live preview" srcDoc={previewHtml} />
          </div>
          <p className="hint preview-hint">Live preview</p>
        </div>
      </div>
    </main>
  );
}
