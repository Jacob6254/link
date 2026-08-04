// app/dashboard/links/page.js
"use client";
// Link Manager : pages bio ET liens courts réunis, organisés par groupes.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader, Modal, RowMenu, Toast } from "../ui";

const TREND_W = 60;
const TREND_H = 20;

// ===== Sparkline des 7 derniers jours =====
function Trend({ byDay }) {
  const max = Math.max(1, ...byDay);
  const step = TREND_W / Math.max(1, byDay.length - 1);
  const pts = byDay
    .map((n, i) => `${(i * step).toFixed(1)},${(TREND_H - (n / max) * TREND_H).toFixed(1)}`)
    .join(" ");
  const rising = byDay[byDay.length - 1] >= byDay[0];
  return (
    <svg className="trend" viewBox={`0 0 ${TREND_W} ${TREND_H}`} aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={rising ? "#199e70" : "#d95926"}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const NEW_PAGE = { slug: "", title: "" };
const NEW_LINK = { slug: "", label: "", web_url: "" };

export default function LinkManager() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [creating, setCreating] = useState(null); // "page" | "link" | "group"
  const [pageForm, setPageForm] = useState(NEW_PAGE);
  const [linkForm, setLinkForm] = useState(NEW_LINK);
  const [groupName, setGroupName] = useState("");
  const [editLink, setEditLink] = useState(null);
  const [renameGroup, setRenameGroup] = useState(null);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  function flash(message, kind = "ok") {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 2600);
  }

  const load = useCallback(async () => {
    const res = await fetch("/api/manager");
    if (res.status === 401) {
      window.location.href = "/login?next=/dashboard/links";
      return;
    }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Failed to load");
      setData({ groups: [], items: [] });
      return;
    }
    setError("");
    setData(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const sections = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const match = (it) =>
      !q ||
      it.title.toLowerCase().includes(q) ||
      it.slug.toLowerCase().includes(q) ||
      (it.subtitle || "").toLowerCase().includes(q);
    const items = data.items.filter(match);
    const out = data.groups
      .map((g) => ({ ...g, items: items.filter((i) => i.group_id === g.id) }))
      .filter((g) => g.items.length > 0 || !q);
    const knownIds = new Set(data.groups.map((g) => g.id));
    const ungrouped = items.filter((i) => !i.group_id || !knownIds.has(i.group_id));
    return [{ id: null, name: "Ungrouped", items: ungrouped }, ...out].filter(
      (s) => s.items.length > 0 || (!q && s.id !== null)
    );
  }, [data, query]);

  const total = data?.items.length || 0;
  const shown = sections.reduce((n, s) => n + s.items.length, 0);

  // ===== Actions =====
  async function api(url, options, okMessage) {
    setBusy(true);
    const res = await fetch(url, options);
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      flash(d.error || "Something went wrong", "err");
      return null;
    }
    if (okMessage) flash(okMessage);
    await load();
    return d;
  }

  async function createPage() {
    const d = await api(
      "/api/pages",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pageForm),
      },
      null
    );
    if (d) window.location.href = `/dashboard/pages/${d.id}`;
  }

  async function createLink() {
    const d = await api(
      "/api/links",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(linkForm),
      },
      "Direct link created"
    );
    if (d) {
      setLinkForm(NEW_LINK);
      setCreating(null);
    }
  }

  async function createGroup() {
    const d = await api(
      "/api/groups",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName }),
      },
      "Group created"
    );
    if (d) {
      setGroupName("");
      setCreating(null);
    }
  }

  async function saveLink() {
    const d = await api(
      `/api/links/${editLink.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editLink),
      },
      "Link updated"
    );
    if (d) setEditLink(null);
  }

  async function saveGroupName() {
    const d = await api(
      `/api/groups/${renameGroup.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameGroup.name }),
      },
      "Group renamed"
    );
    if (d) setRenameGroup(null);
  }

  async function moveTo(item, groupId) {
    const url = item.kind === "page" ? `/api/pages/${item.id}` : `/api/links/${item.id}`;
    const body =
      item.kind === "page"
        ? { group_id: groupId }
        : {
            slug: item.slug,
            label: item.title,
            web_url: item.web_url,
            group_id: groupId,
          };
    await api(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, "Moved");
  }

  async function removeItem(item) {
    const what = item.kind === "page" ? "page and all its buttons" : "direct link";
    if (!confirm(`Delete “${item.title}”? This removes the ${what}.`)) return;
    const url = item.kind === "page" ? `/api/pages/${item.id}` : `/api/links/${item.id}`;
    await api(url, { method: "DELETE" }, "Deleted");
  }

  async function removeGroup(g) {
    const n = data.items.filter((i) => i.group_id === g.id).length;
    const extra = n > 0 ? ` Its ${n} item(s) become ungrouped.` : "";
    if (!confirm(`Delete group “${g.name}”?${extra}`)) return;
    await api(`/api/groups/${g.id}`, { method: "DELETE" }, "Group deleted");
  }

  function copy(slug) {
    navigator.clipboard.writeText(`${origin}/${slug}`);
    flash("Link copied to clipboard");
  }

  return (
    <main className="panel wide">
      <header className="mgr-head">
        <div>
          <h1><span className="card-emoji" aria-hidden="true">🔗</span>Link Manager</h1>
          <p className="hint">
            {data ? (
              <>
                Showing <strong>{shown}</strong>
                {shown !== total && <> of {total}</>} item{total === 1 ? "" : "s"}
              </>
            ) : (
              "Loading…"
            )}
          </p>
        </div>
        <div className="mgr-actions">
          <div className="search">
            <span aria-hidden="true">⌕</span>
            <input
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="ghost" onClick={() => setCreating("group")}>
            🗂️ Group
          </button>
          <button className="ghost" onClick={() => setCreating("link")}>
            ⚡ Direct link
          </button>
          <button onClick={() => setCreating("page")}>✨ Create page</button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {!data && <Loader label="Loading your links" />}
      {data && <div className="route-bar" />}

      {data &&
        sections.map((section, si) => {
          const open = !collapsed[String(section.id)];
          const weekTotal = section.items.reduce((n, i) => n + i.stats.week, 0);
          return (
            <section
              className="card group-card"
              key={String(section.id)}
              style={{ animationDelay: `${si * 45}ms` }}
            >
              <div className="group-head">
                <button
                  className="chev"
                  aria-expanded={open}
                  onClick={() =>
                    setCollapsed((c) => ({ ...c, [String(section.id)]: open }))
                  }
                >
                  <span className={open ? "chev-icon open" : "chev-icon"}>▸</span>
                </button>
                <h2>{section.name}</h2>
                <span className="count">{section.items.length}</span>
                <span className="group-stat">{weekTotal} clicks · 7d</span>
                {section.id !== null && (
                  <RowMenu>
                    <button onClick={() => setRenameGroup({ ...section })}>Rename</button>
                    <button className="pop-danger" onClick={() => removeGroup(section)}>
                      Delete group
                    </button>
                  </RowMenu>
                )}
              </div>

              {open && (
                <ul className="rows">
                  {section.items.length === 0 && (
                    <li className="row-empty hint">
                      Nothing here yet — create a page or a direct link.
                    </li>
                  )}
                  {section.items.map((it) => (
                    <li className="row" key={`${it.kind}-${it.id}`}>
                      <div className="row-ident">
                        {it.kind === "page" ? (
                          /^https?:\/\//i.test(it.avatar || "") ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img className="row-av" src={it.avatar} alt="" />
                          ) : (
                            <span className="row-av row-av-text">
                              {(it.avatar || it.title || "?").trim()[0] || "?"}
                            </span>
                          )
                        ) : (
                          <span className="row-av row-av-link" aria-hidden="true">🔗</span>
                        )}
                        <div className="row-text">
                          <div className="row-title">
                            <strong>{it.title}</strong>
                            <span className={`chip chip-${it.kind}`}>
                              {it.kind === "page" ? "Page" : "Direct"}
                            </span>
                            {it.owner && data.groups && (
                              <span className="chip chip-dim">{it.owner}</span>
                            )}
                          </div>
                          <a
                            className="row-url mono"
                            href={`/${it.slug}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {(origin || "").replace(/^https?:\/\//, "")}/{it.slug}
                          </a>
                          {it.kind === "link" && (
                            <span className="row-dest hint">→ {it.subtitle}</span>
                          )}
                        </div>
                      </div>

                      <div className="row-metrics">
                        <Trend byDay={it.stats.byDay} />
                        <div className="metric">
                          <span className="metric-value">{it.stats.today}</span>
                          <span className="metric-label">today</span>
                        </div>
                        <div className="metric">
                          <span className="metric-value">{it.stats.week}</span>
                          <span className="metric-label">7 days</span>
                        </div>
                        <RowMenu>
                          <button onClick={() => copy(it.slug)}>Copy URL</button>
                          {it.kind === "page" ? (
                            <a href={`/dashboard/pages/${it.id}`}>Edit page</a>
                          ) : (
                            <button
                              onClick={() =>
                                setEditLink({
                                  id: it.id,
                                  slug: it.slug,
                                  label: it.title,
                                  web_url: it.web_url,
                                  group_id: it.group_id || "",
                                })
                              }
                            >
                              Edit link
                            </button>
                          )}
                          <a href={`/dashboard/stats/${it.slug}`}>View stats</a>
                          <a href={`/${it.slug}`} target="_blank" rel="noreferrer">
                            Open ↗
                          </a>
                          <div className="pop-sep">Move to</div>
                          <button onClick={() => moveTo(it, null)}>Ungrouped</button>
                          {data.groups.map((g) => (
                            <button key={g.id} onClick={() => moveTo(it, g.id)}>
                              {g.name}
                            </button>
                          ))}
                          <button className="pop-danger" onClick={() => removeItem(it)}>
                            Delete
                          </button>
                        </RowMenu>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

      {data && total === 0 && !query && (
        <div className="card empty-state">
          <span className="empty-icon" aria-hidden="true">🚀</span>
          <h2>Nothing here yet</h2>
          <p className="hint">
            Create a landing page for your bio, or a direct link that opens straight
            in the native app.
          </p>
          <div className="empty-actions">
            <button onClick={() => setCreating("page")}>+ Create page</button>
            <button className="ghost" onClick={() => setCreating("link")}>
              + Direct link
            </button>
          </div>
        </div>
      )}

      {/* ===== Modales ===== */}
      {creating === "page" && (
        <Modal title="Create a landing page" onClose={() => setCreating(null)}>
          <label className="field">
            <span>Page title</span>
            <input
              autoFocus
              placeholder="Your Name"
              value={pageForm.title}
              onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Slug</span>
            <input
              placeholder="yourname"
              value={pageForm.slug}
              onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && createPage()}
            />
          </label>
          <p className="hint">
            Will live at{" "}
            <span className="mono">
              {(origin || "").replace(/^https?:\/\//, "")}/{pageForm.slug || "slug"}
            </span>
          </p>
          <div className="modal-foot">
            <button className="ghost" onClick={() => setCreating(null)}>Cancel</button>
            <button onClick={createPage} disabled={busy}>
              {busy ? "Creating…" : "Create & edit"}
            </button>
          </div>
        </Modal>
      )}

      {creating === "link" && (
        <Modal title="Create a direct link" onClose={() => setCreating(null)}>
          <label className="field">
            <span>Label</span>
            <input
              autoFocus
              placeholder="My Instagram"
              value={linkForm.label}
              onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Destination URL</span>
            <input
              placeholder="https://www.instagram.com/name/"
              value={linkForm.web_url}
              onChange={(e) => setLinkForm({ ...linkForm, web_url: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Slug</span>
            <input
              placeholder="insta"
              value={linkForm.slug}
              onChange={(e) => setLinkForm({ ...linkForm, slug: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && createLink()}
            />
          </label>
          <p className="hint">
            Opens the native app when possible, and every click is tracked.
          </p>
          <div className="modal-foot">
            <button className="ghost" onClick={() => setCreating(null)}>Cancel</button>
            <button onClick={createLink} disabled={busy}>
              {busy ? "Creating…" : "Create direct link"}
            </button>
          </div>
        </Modal>
      )}

      {creating === "group" && (
        <Modal title="Create a group" onClose={() => setCreating(null)}>
          <label className="field">
            <span>Group name</span>
            <input
              autoFocus
              placeholder="Main account"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createGroup()}
            />
          </label>
          <div className="modal-foot">
            <button className="ghost" onClick={() => setCreating(null)}>Cancel</button>
            <button onClick={createGroup} disabled={busy}>Create</button>
          </div>
        </Modal>
      )}

      {editLink && (
        <Modal title="Edit direct link" onClose={() => setEditLink(null)}>
          <label className="field">
            <span>Label</span>
            <input
              autoFocus
              value={editLink.label}
              onChange={(e) => setEditLink({ ...editLink, label: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Destination URL</span>
            <input
              value={editLink.web_url}
              onChange={(e) => setEditLink({ ...editLink, web_url: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Slug</span>
            <input
              value={editLink.slug}
              onChange={(e) => setEditLink({ ...editLink, slug: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && saveLink()}
            />
          </label>
          <div className="modal-foot">
            <button className="ghost" onClick={() => setEditLink(null)}>Cancel</button>
            <button onClick={saveLink} disabled={busy}>Save</button>
          </div>
        </Modal>
      )}

      {renameGroup && (
        <Modal title="Rename group" onClose={() => setRenameGroup(null)}>
          <label className="field">
            <span>Group name</span>
            <input
              autoFocus
              value={renameGroup.name}
              onChange={(e) => setRenameGroup({ ...renameGroup, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && saveGroupName()}
            />
          </label>
          <div className="modal-foot">
            <button className="ghost" onClick={() => setRenameGroup(null)}>Cancel</button>
            <button onClick={saveGroupName} disabled={busy}>Save</button>
          </div>
        </Modal>
      )}

      <Toast toast={toast} />
    </main>
  );
}
