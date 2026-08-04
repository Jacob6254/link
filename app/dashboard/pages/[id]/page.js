// app/dashboard/pages/[id]/page.js
"use client";
// Éditeur de page bio : identité (avatar uploadable), thème complet (presets,
// couleurs, police, fond d'image avec flou, badge, footer), boutons (image de
// fond, animation, renommage, réordonnancement) — avec aperçu en direct.
// L'aperçu utilise le MÊME moteur de rendu que la page publique (iframe).
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ANIMATIONS, FONTS, PRESETS, renderPageHTML, resolveTheme,
} from "@/lib/pagerender";
import { Loader, Modal, Toast } from "../../ui";

const NEW_BUTTON = { label: "", url: "" };

async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url;
}

// Bouton "Upload" branché sur un input file caché.
function UploadButton({ label, onUploaded, onError, className = "ghost" }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function onChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      onUploaded(await uploadFile(file));
    } catch (err) {
      onError(err.message);
    }
    setBusy(false);
  }

  return (
    <>
      <input
        ref={inputRef} type="file" hidden
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onChange}
      />
      <button type="button" className={className} disabled={busy}
        onClick={() => inputRef.current?.click()}>
        {busy ? "Uploading…" : label}
      </button>
    </>
  );
}

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
  const [templates, setTemplates] = useState([]);
  const [savingTpl, setSavingTpl] = useState(false);
  const [tplName, setTplName] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => setOrigin(window.location.origin), []);

  function flash(message, kind = "ok") {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 2600);
  }

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/templates");
    if (res.ok) setTemplates(await res.json());
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  async function saveTemplate() {
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tplName, theme: page.theme }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return flash(d.error || "Something went wrong", "err");
    setSavingTpl(false);
    setTplName("");
    flash("Template saved");
    loadTemplates();
  }

  function applyTemplate(tpl) {
    setPage((p) => ({ ...p, theme: { ...tpl.theme } }));
    setDirty(true);
    setSaved(false);
    flash(`Applied "${tpl.name}" — hit Save to keep it`);
  }

  async function deleteTemplate(tpl) {
    if (!confirm(`Delete template “${tpl.name}”?`)) return;
    await fetch(`/api/templates/${tpl.id}`, { method: "DELETE" });
    loadTemplates();
  }

  const load = useCallback(async () => {
    const res = await fetch(`/api/pages/${id}`);
    if (res.status === 401) {
      window.location.href = "/login?next=/dashboard/links";
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
    // Un preset remplace les couleurs mais conserve police, fond et options.
    setPage((p) => {
      const { bg1, bg2, accent, text, btnFill, btnShape, ...keep } = p.theme || {};
      return { ...p, theme: { ...keep, preset: key } };
    });
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

  async function patchButton(bid, body) {
    setError("");
    const res = await fetch(`/api/buttons/${bid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return null;
    }
    setButtons((btns) => btns.map((b) => (b.id === bid ? { ...b, ...data } : b)));
    return data;
  }

  async function saveButton(bid) {
    const data = await patchButton(bid, editBtn);
    if (data) setEditBtnId(null);
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
  if (!page) return <main className="panel"><Loader label="Loading editor" /></main>;

  const theme = resolveTheme(page.theme);

  return (
    <main className="panel editor">
      <div className="editor-head">
        <h1>
          <a className="back" href="/dashboard/links">←</a> {page.title}
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
            <h2><span className="card-emoji" aria-hidden="true">📄</span>Page</h2>
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
            <label className="field">
              <span>Slug</span>
              <input
                value={page.slug || ""}
                onChange={(e) => patchLocal({ slug: e.target.value })}
              />
            </label>
            <div className="field">
              <span className="field-label">Avatar</span>
              <div className="upload-row">
                {/^https?:\/\//i.test(page.avatar || "") ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img className="thumb" src={page.avatar} alt="" />
                ) : (
                  <span className="thumb thumb-text">
                    {(page.avatar || page.title || "?").trim()[0] || "?"}
                  </span>
                )}
                <UploadButton
                  label="Upload photo"
                  onUploaded={(url) => patchLocal({ avatar: url })}
                  onError={setError}
                />
                <input
                  className="grow"
                  placeholder="…or an emoji (😎)"
                  value={/^https?:\/\//i.test(page.avatar || "") ? "" : page.avatar || ""}
                  onChange={(e) => patchLocal({ avatar: e.target.value })}
                />
                {page.avatar && (
                  <button className="ghost" onClick={() => patchLocal({ avatar: "" })}>
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="theme-controls">
              <label className="field">
                <span>Avatar size — {theme.avatarSize}px</span>
                <input
                  type="range" min="56" max="200" step="4"
                  value={theme.avatarSize}
                  onChange={(e) => patchTheme({ avatarSize: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>Avatar shape</span>
                <select
                  value={theme.avatarShape}
                  onChange={(e) => patchTheme({ avatarShape: e.target.value })}
                >
                  <option value="circle">Circle</option>
                  <option value="square">Rounded square</option>
                </select>
              </label>
            </div>

            <div className="field">
              <span className="field-label">Cover photo (banner above the avatar)</span>
              <div className="upload-row">
                {theme.cover && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img className="thumb thumb-wide" src={theme.cover} alt="" />
                )}
                <UploadButton
                  label={theme.cover ? "Replace cover" : "Upload cover"}
                  onUploaded={(url) => patchTheme({ cover: url })}
                  onError={setError}
                />
                {theme.cover && (
                  <button className="ghost" onClick={() => patchTheme({ cover: "" })}>
                    Remove
                  </button>
                )}
              </div>
            </div>
            {theme.cover && (
              <label className="field">
                <span>Cover height — {theme.coverHeight}px</span>
                <input
                  type="range" min="80" max="320" step="10"
                  value={theme.coverHeight}
                  onChange={(e) => patchTheme({ coverHeight: Number(e.target.value) })}
                />
              </label>
            )}

            <label className="check">
              <input
                type="checkbox"
                checked={!!page.theme?.titleBadge}
                onChange={(e) => patchTheme({ titleBadge: e.target.checked })}
              />
              <span>Verified badge next to the title</span>
            </label>
          </section>

          <section className="card">
            <div className="card-head">
              <h2><span className="card-emoji" aria-hidden="true">🧱</span>Templates <span className="count">{templates.length}</span></h2>
              <button className="ghost" onClick={() => setSavingTpl(true)}>
                Save current design
              </button>
            </div>
            {templates.length === 0 ? (
              <p className="hint">
                No templates yet. Style this page the way you like, then hit
                “Save current design” to reuse it on your other pages in one click.
              </p>
            ) : (
              <div className="tpl-grid">
                {templates.map((t) => {
                  const tt = resolveTheme(t.theme);
                  return (
                    <div className="tpl" key={t.id}>
                      <button
                        className="tpl-swatch"
                        style={{ background: `linear-gradient(150deg, ${tt.bg1}, ${tt.bg2})` }}
                        onClick={() => applyTemplate(t)}
                        title={`Apply ${t.name}`}
                      >
                        <span className="tpl-pill" style={{ background: tt.accent }} />
                        <span className="tpl-pill tpl-pill-sm" style={{ background: tt.accent, opacity: 0.55 }} />
                      </button>
                      <div className="tpl-foot">
                        <span className="tpl-name" title={t.name}>{t.name}</span>
                        <button
                          className="icon-btn tpl-del"
                          onClick={() => deleteTemplate(t)}
                          aria-label={`Delete ${t.name}`}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card">
            <h2><span className="card-emoji" aria-hidden="true">🎨</span>Theme</h2>
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
                <span>Text</span>
                <input
                  type="color"
                  value={theme.text}
                  onChange={(e) => patchTheme({ text: e.target.value })}
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
                <span>Font</span>
                <select
                  value={theme.font}
                  onChange={(e) => patchTheme({ font: e.target.value })}
                >
                  {Object.entries(FONTS).map(([key, f]) => (
                    <option key={key} value={key}>{f.name}</option>
                  ))}
                </select>
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

            <div className="field">
              <span className="field-label">Background image</span>
              <div className="upload-row">
                {theme.bgImage && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img className="thumb thumb-wide" src={theme.bgImage} alt="" />
                )}
                <UploadButton
                  label={theme.bgImage ? "Replace image" : "Upload image"}
                  onUploaded={(url) => patchTheme({ bgImage: url })}
                  onError={setError}
                />
                {theme.bgImage && (
                  <button className="ghost" onClick={() => patchTheme({ bgImage: "" })}>
                    Remove
                  </button>
                )}
              </div>
            </div>
            {theme.bgImage && (
              <div className="theme-controls">
                <label className="field">
                  <span>Blur — {theme.bgBlur}px</span>
                  <input
                    type="range" min="0" max="30"
                    value={theme.bgBlur}
                    onChange={(e) => patchTheme({ bgBlur: Number(e.target.value) })}
                  />
                </label>
                <label className="field">
                  <span>Darken — {theme.bgDim}%</span>
                  <input
                    type="range" min="0" max="80"
                    value={theme.bgDim}
                    onChange={(e) => patchTheme({ bgDim: Number(e.target.value) })}
                  />
                </label>
              </div>
            )}

            <label className="check">
              <input
                type="checkbox"
                checked={!!page.theme?.hideFooter}
                onChange={(e) => patchTheme({ hideFooter: e.target.checked })}
              />
              <span>Hide the AllMySocials footer</span>
            </label>
            <p className="hint">Theme and page info are applied when you hit Save.</p>
          </section>

          <section className="card">
            <h2><span className="card-emoji" aria-hidden="true">🔲</span>Buttons <span className="count">{buttons.length}</span></h2>
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
              Click Edit on a button to give it a background photo (banner style)
              or an animation. Every click opens the native app when possible and
              is tracked in Analytics.
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
                    <div className="form-row">
                      <label className="field">
                        <span>Animation</span>
                        <select
                          value={editBtn.animation || "none"}
                          onChange={(e) => setEditBtn({ ...editBtn, animation: e.target.value })}
                        >
                          {Object.entries(ANIMATIONS).map(([key, name]) => (
                            <option key={key} value={key}>{name}</option>
                          ))}
                        </select>
                      </label>
                      <div className="field">
                        <span className="field-label">Background photo</span>
                        <div className="upload-row">
                          {editBtn.image && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img className="thumb thumb-wide" src={editBtn.image} alt="" />
                          )}
                          <UploadButton
                            label={editBtn.image ? "Replace" : "Upload"}
                            onUploaded={(url) => setEditBtn({ ...editBtn, image: url })}
                            onError={setError}
                          />
                          {editBtn.image && (
                            <button className="ghost"
                              onClick={() => setEditBtn({ ...editBtn, image: "" })}>
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="actions">
                      <button onClick={() => saveButton(b.id)}>Save</button>
                      <button className="ghost" onClick={() => setEditBtnId(null)}>Cancel</button>
                    </div>
                  </li>
                ) : (
                  <li key={b.id}>
                    <div className="link-info btn-row">
                      {b.image && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img className="thumb thumb-wide" src={b.image} alt="" />
                      )}
                      <div>
                        <strong>{b.label}</strong>
                        {b.animation && b.animation !== "none" && (
                          <span className="badge">{ANIMATIONS[b.animation]}</span>
                        )}
                        <br />
                        <span className="hint">{b.url}</span>
                      </div>
                    </div>
                    <div className="actions">
                      <button className="ghost move" disabled={i === 0}
                        onClick={() => moveButton(i, -1)} title="Move up">↑</button>
                      <button className="ghost move" disabled={i === buttons.length - 1}
                        onClick={() => moveButton(i, 1)} title="Move down">↓</button>
                      <button className="ghost"
                        onClick={() => {
                          setEditBtnId(b.id);
                          setEditBtn({
                            label: b.label, url: b.url,
                            image: b.image || "", animation: b.animation || "none",
                          });
                        }}>
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

      {savingTpl && (
        <Modal title="Save design as template" onClose={() => setSavingTpl(false)}>
          <label className="field">
            <span>Template name</span>
            <input
              autoFocus
              placeholder="Pink & bold"
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveTemplate()}
            />
          </label>
          <p className="hint">
            Saves colours, font, button style, background image and options —
            not the buttons or the text of this page.
          </p>
          <div className="modal-foot">
            <button className="ghost" onClick={() => setSavingTpl(false)}>Cancel</button>
            <button onClick={saveTemplate}>Save template</button>
          </div>
        </Modal>
      )}

      <Toast toast={toast} />
    </main>
  );
}
