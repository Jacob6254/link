// app/dashboard/stats/page.js
"use client";
// Statistiques détaillées : tuiles, clics par jour, plateformes, pays, par lien.
// Graphiques SVG maison — palette validée (CVD-safe) : bleu / orange / vert.
import { useEffect, useMemo, useState } from "react";

const SERIES = { android: "#3987e5", ios: "#d95926", desktop: "#199e70" };
const PLATFORM_LABEL = { android: "Android", ios: "iOS", desktop: "Desktop" };

function flagEmoji(code) {
  if (!/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function countryName(code) {
  if (!/^[A-Z]{2}$/.test(code)) return "Unknown";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

// "2026-07-31" -> "Jul 31"
function shortDate(day) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// ===== Graphique barres : clics par jour =====
function DayChart({ byDay }) {
  const [tip, setTip] = useState(null);
  const days = useMemo(
    () => Object.entries(byDay).sort(([a], [b]) => (a < b ? -1 : 1)),
    [byDay]
  );
  const W = 640, H = 180, PAD_L = 30, PAD_B = 20, PAD_T = 8;
  const max = Math.max(1, ...days.map(([, n]) => n));
  const innerW = W - PAD_L - 4;
  const innerH = H - PAD_B - PAD_T;
  const step = innerW / days.length;
  const barW = Math.max(4, step - 2);

  const gridLines = [0.5, 1].map((f) => Math.round(max * f));

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img"
        aria-label="Clicks per day over 30 days">
        {gridLines.map((v) => {
          const y = PAD_T + innerH - (v / max) * innerH;
          return (
            <g key={v}>
              <line x1={PAD_L} x2={W - 4} y1={y} y2={y} className="grid" />
              <text x={PAD_L - 6} y={y + 3} className="tick" textAnchor="end">{v}</text>
            </g>
          );
        })}
        <line x1={PAD_L} x2={W - 4} y1={PAD_T + innerH} y2={PAD_T + innerH} className="axis" />
        {days.map(([day, n], i) => {
          const h = max ? (n / max) * innerH : 0;
          const x = PAD_L + i * step + 1;
          const y = PAD_T + innerH - h;
          return (
            <g key={day}>
              {/* zone de survol plus large que la barre */}
              <rect
                x={PAD_L + i * step} y={PAD_T} width={step} height={innerH + PAD_B}
                fill="transparent"
                onMouseEnter={() => setTip({ i, day, n })}
                onMouseLeave={() => setTip(null)}
              />
              {n > 0 && (
                <rect
                  x={x} y={y} width={barW} height={Math.max(h, 2)} rx="3"
                  fill="#3987e5" opacity={tip && tip.i !== i ? 0.45 : 1}
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}
        {days.map(([day], i) =>
          i % 5 === 0 ? (
            <text key={day} x={PAD_L + i * step + step / 2} y={H - 6}
              className="tick" textAnchor="middle">
              {shortDate(day)}
            </text>
          ) : null
        )}
      </svg>
      {tip && (
        <div className="chart-tip" style={{ left: `${((PAD_L + tip.i * step + step / 2) / W) * 100}%` }}>
          <strong>{tip.n}</strong> click{tip.n === 1 ? "" : "s"} — {shortDate(tip.day)}
        </div>
      )}
    </div>
  );
}

// ===== Barres horizontales génériques (valeur directe affichée) =====
function HBar({ value, max, color }) {
  const pct = max ? Math.max((value / max) * 100, 2) : 0;
  return (
    <div className="hbar-track">
      <div className="hbar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/stats");
      if (res.status === 401) {
        window.location.href = "/login?next=/dashboard/stats";
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load");
        return;
      }
      setStats(await res.json());
    })();
  }, []);

  if (error) return <main className="panel"><p className="error">{error}</p></main>;
  if (!stats) return <main className="panel"><p className="hint">Loading…</p></main>;

  const { total, byDay, byLink, byPlatform, byCountry, byGroup = [], windowDays, capped } = stats;
  const bestLink = byLink[0];
  const bestCountry = byCountry[0];
  const platEntries = Object.entries(byPlatform).sort(([, a], [, b]) => b - a);
  const bestPlatform = platEntries[0];
  const maxPlat = Math.max(1, ...platEntries.map(([, n]) => n));
  const maxCountry = Math.max(1, ...byCountry.map((c) => c.total));
  const maxLink = Math.max(1, ...byLink.map((l) => l.total));
  const maxGroup = Math.max(1, ...byGroup.map((g) => g.total));
  // Un seul groupe "Ungrouped" = rien à comparer, on masque la section.
  const showGroups = byGroup.length > 1 || (byGroup[0] && byGroup[0].name !== "Ungrouped");

  return (
    <main className="panel">
      <h1>Analytics <span className="hint">— last {windowDays} days{capped ? " (window full)" : ""}</span></h1>

      <div className="tiles">
        <div className="tile">
          <span className="tile-label">Clicks</span>
          <span className="tile-value">{total}</span>
        </div>
        <div className="tile">
          <span className="tile-label">Top link</span>
          <span className="tile-value tile-small">
            {bestLink ? `/${bestLink.slug}` : "—"}
          </span>
          {bestLink && <span className="tile-sub">{bestLink.total} clicks</span>}
        </div>
        <div className="tile">
          <span className="tile-label">Top country</span>
          <span className="tile-value tile-small">
            {bestCountry ? `${flagEmoji(bestCountry.code)} ${countryName(bestCountry.code)}` : "—"}
          </span>
          {bestCountry && <span className="tile-sub">{bestCountry.total} clicks</span>}
        </div>
        <div className="tile">
          <span className="tile-label">Top platform</span>
          <span className="tile-value tile-small">
            {bestPlatform && bestPlatform[1] > 0 ? PLATFORM_LABEL[bestPlatform[0]] : "—"}
          </span>
          {bestPlatform && bestPlatform[1] > 0 && (
            <span className="tile-sub">{bestPlatform[1]} clicks</span>
          )}
        </div>
      </div>

      <section className="card">
        <h2>Clicks per day</h2>
        {total === 0 ? <p className="hint">No clicks in this period.</p> : <DayChart byDay={byDay} />}
      </section>

      <div className="two-col">
        <section className="card">
          <h2>Platforms</h2>
          {platEntries.map(([key, n]) => (
            <div className="hbar-row" key={key}>
              <span className="hbar-label">
                <span className="dot" style={{ background: SERIES[key] }} aria-hidden="true" />
                {PLATFORM_LABEL[key]}
              </span>
              <HBar value={n} max={maxPlat} color={SERIES[key]} />
              <span className="hbar-value">{n}</span>
            </div>
          ))}
        </section>

        <section className="card">
          <h2>Countries</h2>
          {byCountry.length === 0 && <p className="hint">No country data yet.</p>}
          {byCountry.slice(0, 10).map((c) => (
            <div className="hbar-row" key={c.code}>
              <span className="hbar-label" title={countryName(c.code)}>
                <span aria-hidden="true">{flagEmoji(c.code)}</span> {countryName(c.code)}
              </span>
              <HBar value={c.total} max={maxCountry} color="#3987e5" />
              <span className="hbar-value">{c.total}</span>
            </div>
          ))}
          <p className="hint">
            Country comes from the host (Vercel) — clicks recorded before this
            feature shipped show up as “Unknown”.
          </p>
        </section>
      </div>

      {showGroups && (
        <section className="card">
          <h2>By group</h2>
          {byGroup.map((g) => (
            <div className="hbar-row" key={g.name}>
              <span className="hbar-label" title={g.name}>{g.name}</span>
              <HBar value={g.total} max={maxGroup} color="#3987e5" />
              <span className="hbar-value">{g.total}</span>
            </div>
          ))}
        </section>
      )}

      <section className="card">
        <h2>By link</h2>
        {byLink.length === 0 && <p className="hint">No clicks in this period.</p>}
        {byLink.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Link</th>
                <th className="th-bar" aria-hidden="true"></th>
                <th>Total</th>
                <th>Android</th>
                <th>iOS</th>
                <th>Desktop</th>
              </tr>
            </thead>
            <tbody>
              {byLink.map((l) => (
                <tr key={l.slug}>
                  <td>
                    <strong>{l.label}</strong> <span className="mono">/{l.slug}</span>
                  </td>
                  <td className="th-bar">
                    <HBar value={l.total} max={maxLink} color="#3987e5" />
                  </td>
                  <td><strong>{l.total}</strong></td>
                  <td>{l.android}</td>
                  <td>{l.ios}</td>
                  <td>{l.desktop}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
