// app/dashboard/pages/[id]/page.js
"use client";
// Éditeur de page bio : identité (avatar uploadable), thème complet (presets,
// couleurs, police, fond d'image avec flou, badge, footer), boutons (image de
// fond, animation, renommage, réordonnancement) — avec aperçu en direct.
// L'aperçu utilise le MÊME moteur de rendu que la page publique (iframe).
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ANIMATIONS, BRAND_ICONS, FONTS, HEADER_STYLES, PRESETS,
  renderPageHTML, resolveTheme,
} from "@/lib/pagerender";
import { Loader, Modal, Toast } from "../../ui";
import {
  IconBack, IconButton, IconDown, IconEdit, IconExternal, IconLayers,
  IconPage, IconPalette, IconTrash, IconType, IconUp, IconUpload,
} from "../../icons";

const NEW_BUTTON = { label: "", url: "", kind: "link" };

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
        {busy ? "Uploading…" : <><IconUpload className="ico" size={14} />{label}</>}
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

  // L'aperçu doit refléter le bouton en cours d'édition AVANT l'enregistrement,
  // sinon on croit qu'un réglage (logo, animation, police) ne fonctionne pas.
  const previewHtml = useMemo(() => {
    if (!page) return "";
    const merged = editBtnId
      ? buttons.map((b) => (b.id === editBtnId ? { ...b, ...editBtn } : b))
      : buttons;
    return renderPageHTML(page, merged, { preview: true });
  }, [page, buttons, editBtnId, editBtn]);

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
        discord_id: page.discord_id || "",
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
          <a className="back" href="/dashboard/links"><IconBack size={17} /></a> {page.title}
          <a
            className="mono page-url"
            href={`/${page.slug}`}
            target="_blank"
            rel="noreferrer"
          >
            {origin}/{page.slug} <IconExternal size={13} />
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
            <h2><span className="ico-box"><IconPage size={15} /></span>Page</h2>
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
                <span>Discord ID <span className="opt">optional</span></span>
                <input
                  placeholder="1423561938570444893"
                  value={page.discord_id || ""}
                  onChange={(e) => patchLocal({ discord_id: e.target.value })}
                />
              </label>
            </div>
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
            {page.theme?.titleBadge && (
              <label className="field color-field badge-color">
                <span>Badge colour</span>
                <input
                  type="color"
                  value={theme.badgeColor}
                  onChange={(e) => patchTheme({ badgeColor: e.target.value })}
                />
              </label>
            )}

            <label className="check">
              <input
                type="checkbox"
                checked={!!page.theme?.online}
                onChange={(e) => patchTheme({ online: e.target.checked })}
              />
              <span>Show an “online” pill</span>
            </label>
            <div className="theme-controls">
              {page.theme?.online && (
                <label className="field">
                  <span>Online text</span>
                  <input
                    placeholder="Online"
                    value={theme.onlineText}
                    onChange={(e) => patchTheme({ onlineText: e.target.value })}
                  />
                </label>
              )}
              <label className="field">
                <span>Location <span className="opt">optional</span></span>
                <input
                  placeholder="Paris"
                  value={theme.location}
                  onChange={(e) => patchTheme({ location: e.target.value })}
                />
              </label>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2><span className="ico-box"><IconLayers size={15} /></span>Templates <span className="count">{templates.length}</span></h2>
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
            <h2><span className="ico-box"><IconPalette size={15} /></span>Theme</h2>
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
                <span>Background</span>
                <select
                  value={theme.flatBg ? "flat" : "gradient"}
                  onChange={(e) => patchTheme({ flatBg: e.target.value === "flat" })}
                >
                  <option value="gradient">Gradient (Background 1 to 2)</option>
                  <option value="flat">Flat - Background 2 only</option>
                </select>
              </label>
              <label className="field">
                <span>Header style</span>
                <select
                  value={theme.headerStyle}
                  onChange={(e) => patchTheme({ headerStyle: e.target.value })}
                >
                  {Object.entries(HEADER_STYLES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
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
              <label className="field">
                <span>Button size</span>
                <select
                  value={theme.btnSize}
                  onChange={(e) => patchTheme({ btnSize: e.target.value })}
                >
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                </select>
              </label>
              <label className="field">
                <span>
                  Corner radius{" "}
                  {theme.btnRadius >= 0 ? `- ${theme.btnRadius}px` : "- from shape"}
                </span>
                <input
                  type="range" min="-1" max="40"
                  value={theme.btnRadius}
                  onChange={(e) => patchTheme({ btnRadius: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>Border width - {theme.btnBorderWidth}px</span>
                <input
                  type="range" min="0" max="8"
                  value={theme.btnBorderWidth}
                  onChange={(e) => patchTheme({ btnBorderWidth: Number(e.target.value) })}
                />
              </label>
              {theme.btnBorderWidth > 0 && (
                <label className="field color-field">
                  <span>Border colour</span>
                  <input
                    type="color"
                    value={theme.btnBorderColor}
                    onChange={(e) => patchTheme({ btnBorderColor: e.target.value })}
                  />
                </label>
              )}
              <label className="field">
                <span>Banner height - {theme.btnImageHeight}px</span>
                <input
                  type="range" min="70" max="300" step="5"
                  value={theme.btnImageHeight}
                  onChange={(e) => patchTheme({ btnImageHeight: Number(e.target.value) })}
                />
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
            <h2><span className="ico-box"><IconButton size={15} /></span>Buttons <span className="count">{buttons.length}</span></h2>
            <div className="seg">
              <button
                className={newBtn.kind === "link" ? "seg-btn active" : "seg-btn"}
                onClick={() => setNewBtn({ ...newBtn, kind: "link" })}
              >
                <IconButton className="ico" size={15} /> Button
              </button>
              <button
                className={newBtn.kind === "heading" ? "seg-btn active" : "seg-btn"}
                onClick={() => setNewBtn({ ...newBtn, kind: "heading" })}
              >
                <IconType className="ico" size={15} /> Text heading
              </button>
            </div>
            <div className="form-row">
              <input
                placeholder={
                  newBtn.kind === "heading"
                    ? "Heading text (e.g. ▼ ANSWER HERE ▼)"
                    : "Button label (e.g. My Instagram)"
                }
                value={newBtn.label}
                onChange={(e) => setNewBtn({ ...newBtn, label: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && newBtn.kind === "heading" && addButton()}
              />
              {newBtn.kind === "link" && (
                <input
                  placeholder="https://…"
                  value={newBtn.url}
                  onChange={(e) => setNewBtn({ ...newBtn, url: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && addButton()}
                />
              )}
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
                      {editBtn.kind !== "heading" && (
                        <input
                          value={editBtn.url}
                          onChange={(e) => setEditBtn({ ...editBtn, url: e.target.value })}
                        />
                      )}
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
                      {editBtn.kind === "heading" && (
                        <label className="field">
                          <span>Font</span>
                          <select
                            value={editBtn.font || ""}
                            onChange={(e) => setEditBtn({ ...editBtn, font: e.target.value })}
                          >
                            <option value="">Page font</option>
                            {Object.entries(FONTS).map(([key, f]) => (
                              <option key={key} value={key}>{f.name}</option>
                            ))}
                          </select>
                        </label>
                      )}
                      {editBtn.kind !== "heading" && (
                      <div className="field">
                        <span className="field-label">
                          Icon <span className="opt">pick a logo, upload, or type an emoji</span>
                        </span>
                        <div className="brand-row">
                          {Object.entries(BRAND_ICONS).map(([key, b]) => (
                            <button
                              key={key}
                              type="button"
                              title={b.name}
                              className={
                                editBtn.icon === `brand:${key}` ? "brand-pick active" : "brand-pick"
                              }
                              style={{ background: b.bg }}
                              onClick={() => setEditBtn({ ...editBtn, icon: `brand:${key}` })}
                              dangerouslySetInnerHTML={{ __html: b.svg }}
                            />
                          ))}
                        </div>
                        <div className="upload-row">
                          <input
                            className="grow"
                            placeholder="Emoji, e.g. ⭐"
                            value={
                              /^(https?:\/\/|brand:)/i.test(editBtn.icon || "")
                                ? ""
                                : editBtn.icon || ""
                            }
                            onChange={(e) => setEditBtn({ ...editBtn, icon: e.target.value })}
                          />
                          <UploadButton
                            label="Upload"
                            onUploaded={(url) => setEditBtn({ ...editBtn, icon: url })}
                            onError={setError}
                          />
                          {editBtn.icon && (
                            <button className="ghost"
                              onClick={() => setEditBtn({ ...editBtn, icon: "" })}>
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                      )}

                      {editBtn.kind !== "heading" && (
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
                      )}
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
                        {b.kind === "heading" && <span className="badge">heading</span>}
                        {b.animation && b.animation !== "none" && (
                          <span className="badge">{ANIMATIONS[b.animation]}</span>
                        )}
                        {b.kind !== "heading" && (
                          <>
                            <br />
                            <span className="hint">{b.url}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="actions">
                      <button className="ghost move" disabled={i === 0}
                        onClick={() => moveButton(i, -1)} title="Move up"><IconUp size={14} /></button>
                      <button className="ghost move" disabled={i === buttons.length - 1}
                        onClick={() => moveButton(i, 1)} title="Move down"><IconDown size={14} /></button>
                      <button className="ghost"
                        onClick={() => {
                          setEditBtnId(b.id);
                          setEditBtn({
                            label: b.label, url: b.url,
                            image: b.image || "", animation: b.animation || "none",
                            icon: b.icon || "", kind: b.kind || "link",
                            font: b.font || "",
                          });
                        }}>
                        <IconEdit className="ico" size={14} />Edit
                      </button>
                      <button className="danger" onClick={() => removeButton(b.id, b.label)}>
                        <IconTrash className="ico" size={14} />Delete
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
