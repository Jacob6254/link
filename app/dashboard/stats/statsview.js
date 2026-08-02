// app/dashboard/stats/statsview.js
"use client";
// Vue analytics partagée : globale (slug = null) ou pour un lien précis.
// Palette catégorielle validée CVD-safe.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader, RangePicker, daysAgoISO, todayISO } from "../ui";

const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#9085e9"];
const PLATFORM_COLOR = { android: "#3987e5", ios: "#d95926", desktop: "#199e70" };
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

function fmtDay(day, long = false) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(long ? { weekday: "short" } : {}),
    timeZone: "UTC",
  });
}

// ===== Courbe en aire avec repère au survol =====
function AreaChart({ byDay }) {
  const [hover, setHover] = useState(null);
  const W = 720, H = 210, PAD_L = 34, PAD_R = 8, PAD_T = 12, PAD_B = 26;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const max = Math.max(1, ...byDay.map((d) => d.total));
  const stepX = byDay.length > 1 ? innerW / (byDay.length - 1) : 0;
  const x = (i) => PAD_L + i * stepX;
  const y = (v) => PAD_T + innerH - (v / max) * innerH;

  const line = byDay.map((d, i) => `${x(i).toFixed(1)},${y(d.total).toFixed(1)}`).join(" ");
  const area = `${PAD_L},${PAD_T + innerH} ${line} ${x(byDay.length - 1).toFixed(1)},${PAD_T + innerH}`;
  const ticks = [0, Math.round(max / 2), max].filter((v, i, a) => a.indexOf(v) === i);
  const labelEvery = Math.max(1, Math.ceil(byDay.length / 7));

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart"
        role="img"
        aria-label="Clicks over time"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3987e5" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#3987e5" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} className="grid" />
            <text x={PAD_L - 7} y={y(v) + 3} className="tick" textAnchor="end">{v}</text>
          </g>
        ))}

        <polygon points={area} fill="url(#areaFill)" />
        <polyline
          points={line} fill="none" stroke="#3987e5"
          strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        />

        {hover !== null && (
          <>
            <line
              x1={x(hover)} x2={x(hover)} y1={PAD_T} y2={PAD_T + innerH}
              stroke="#3987e5" strokeWidth="1" strokeDasharray="3 3" opacity="0.7"
            />
            <circle cx={x(hover)} cy={y(byDay[hover].total)} r="4.5"
              fill="#3987e5" stroke="#101827" strokeWidth="2" />
          </>
        )}

        {byDay.map((d, i) => (
          <rect
            key={d.day}
            x={x(i) - stepX / 2} y={PAD_T} width={Math.max(stepX, 6)} height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}

        {byDay.map((d, i) =>
          i % labelEvery === 0 ? (
            <text key={d.day} x={x(i)} y={H - 7} className="tick" textAnchor="middle">
              {fmtDay(d.day)}
            </text>
          ) : null
        )}
      </svg>
      {hover !== null && (
        <div
          className="chart-tip"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <strong>{byDay[hover].total}</strong> click{byDay[hover].total === 1 ? "" : "s"} ·{" "}
          {fmtDay(byDay[hover].day, true)}
        </div>
      )}
    </div>
  );
}

// ===== Donut =====
function Donut({ data, total }) {
  const R = 42, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <svg className="donut" viewBox="0 0 110 110" role="img" aria-label="Breakdown">
      <circle cx="55" cy="55" r={R} fill="none" stroke="#1e2b45" strokeWidth="15" />
      {data.map((d, i) => {
        const frac = total ? d.total / total : 0;
        const dash = `${(frac * C).toFixed(2)} ${C.toFixed(2)}`;
        const el = (
          <circle
            key={d.name} cx="55" cy="55" r={R} fill="none"
            stroke={SERIES[i % SERIES.length]} strokeWidth="15"
            strokeDasharray={dash} strokeDashoffset={-offset}
            transform="rotate(-90 55 55)"
          />
        );
        offset += frac * C;
        return el;
      })}
      <text x="55" y="52" className="donut-value" textAnchor="middle">{total}</text>
      <text x="55" y="66" className="donut-label" textAnchor="middle">CLICKS</text>
    </svg>
  );
}

function HBar({ value, max, color }) {
  const pct = max ? Math.max((value / max) * 100, 2) : 0;
  return (
    <div className="hbar-track">
      <div className="hbar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function BarList({ rows, keyName = "name", color = "#3987e5", icon, limit = 8 }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  const total = rows.reduce((n, r) => n + r.total, 0);
  if (rows.length === 0) return <p className="hint">No data for this period.</p>;
  return (
    <>
      {rows.slice(0, limit).map((r, i) => (
        <div className="hbar-row" key={r[keyName]}>
          <span className="hbar-label" title={String(r[keyName])}>
            {icon ? icon(r) : r[keyName]}
          </span>
          <HBar value={r.total} max={max} color={typeof color === "function" ? color(r, i) : color} />
          <span className="hbar-value">
            {r.total}
            <span className="hbar-pct">{total ? Math.round((r.total / total) * 100) : 0}%</span>
          </span>
        </div>
      ))}
    </>
  );
}

export default function StatsView({ slug = null }) {
  const [range, setRange] = useState({
    preset: "30d",
    from: daysAgoISO(30),
    to: todayISO(),
  });
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ from: range.from, to: range.to });
    if (slug) qs.set("slug", slug);
    const res = await fetch(`/api/stats?${qs}`);
    if (res.status === 401) {
      window.location.href = `/login?next=/dashboard/stats`;
      return;
    }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Failed to load");
      setLoading(false);
      return;
    }
    setError("");
    setStats(await res.json());
    setLoading(false);
  }, [range.from, range.to, slug]);

  useEffect(() => { load(); }, [load]);

  const platRows = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byPlatform)
      .map(([k, total]) => ({ name: PLATFORM_LABEL[k] || k, key: k, total }))
      .sort((a, b) => b.total - a.total);
  }, [stats]);

  if (error) return <main className="panel wide"><p className="error">{error}</p></main>;
  if (!stats) return <main className="panel wide"><Loader label="Loading analytics" /></main>;

  const { meta, total, byDay, byLink, byCountry, byGroup, byOS, bySource, byButton } = stats;
  const best = byLink[0];
  const bestCountry = byCountry[0];
  const bestSource = bySource[0];
  const busiest = [...byDay].sort((a, b) => b.total - a.total)[0];
  const avg = byDay.length ? Math.round((total / byDay.length) * 10) / 10 : 0;
  const showGroups = !slug && (byGroup.length > 1 || byGroup[0]?.name !== "Ungrouped");

  return (
    <main className={loading ? "panel wide is-loading" : "panel wide"}>
      <header className="mgr-head">
        <div>
          <h1>
            {slug && <a className="back" href="/dashboard/stats">←</a>}{" "}
            {slug ? meta.title || slug : "Analytics"}
          </h1>
          <p className="hint">
            {slug ? (
              <>
                <span className={`chip chip-${meta.kind}`}>
                  {meta.kind === "page" ? "Page" : "Link"}
                </span>{" "}
                <span className="mono">/{slug}</span> · {fmtDay(meta.from)} – {fmtDay(meta.to)}
              </>
            ) : (
              <>
                {fmtDay(meta.from)} – {fmtDay(meta.to)} · {meta.days} days
                {meta.capped && " (window full)"}
              </>
            )}
          </p>
        </div>
        <RangePicker range={range} onChange={setRange} />
      </header>

      <div className="tiles">
        <div className="tile">
          <span className="tile-label">Clicks</span>
          <span className="tile-value">{total}</span>
          <span className="tile-sub">{avg}/day average</span>
        </div>
        <div className="tile">
          <span className="tile-label">Busiest day</span>
          <span className="tile-value tile-small">
            {busiest && busiest.total > 0 ? fmtDay(busiest.day) : "—"}
          </span>
          {busiest && busiest.total > 0 && (
            <span className="tile-sub">{busiest.total} clicks</span>
          )}
        </div>
        <div className="tile">
          <span className="tile-label">Top country</span>
          <span className="tile-value tile-small">
            {bestCountry
              ? `${flagEmoji(bestCountry.code)} ${countryName(bestCountry.code)}`
              : "—"}
          </span>
          {bestCountry && <span className="tile-sub">{bestCountry.total} clicks</span>}
        </div>
        <div className="tile">
          <span className="tile-label">{slug ? "Top source" : "Top link"}</span>
          <span className="tile-value tile-small">
            {slug
              ? bestSource?.name || "—"
              : best
                ? `/${best.slug}`
                : "—"}
          </span>
          {(slug ? bestSource : best) && (
            <span className="tile-sub">{(slug ? bestSource : best).total} clicks</span>
          )}
        </div>
      </div>

      <section className="card">
        <h2>Clicks over time</h2>
        {total === 0 ? (
          <p className="hint">No clicks in this period.</p>
        ) : (
          <AreaChart byDay={byDay} />
        )}
      </section>

      <div className="two-col">
        <section className="card">
          <h2>Operating system</h2>
          <div className="donut-row">
            <Donut data={byOS} total={total} />
            <div className="donut-legend">
              {byOS.slice(0, 6).map((o, i) => (
                <div className="legend-item" key={o.name}>
                  <span className="dot" style={{ background: SERIES[i % SERIES.length] }} />
                  <span className="legend-name">{o.name}</span>
                  <span className="legend-value">{o.total}</span>
                </div>
              ))}
              {byOS.length === 0 && <p className="hint">No data.</p>}
            </div>
          </div>
        </section>

        <section className="card">
          <h2>Traffic sources</h2>
          <BarList rows={bySource} color="#9085e9" />
        </section>
      </div>

      <div className="two-col">
        <section className="card">
          <h2>Countries</h2>
          <BarList
            rows={byCountry}
            keyName="code"
            color="#3987e5"
            icon={(r) => (
              <>
                <span aria-hidden="true">{flagEmoji(r.code)}</span> {countryName(r.code)}
              </>
            )}
          />
        </section>

        <section className="card">
          <h2>Platforms</h2>
          <BarList
            rows={platRows}
            color={(r) => PLATFORM_COLOR[r.key] || "#3987e5"}
            icon={(r) => (
              <>
                <span className="dot" style={{ background: PLATFORM_COLOR[r.key] }} />
                {r.name}
              </>
            )}
          />
        </section>
      </div>

      {slug && meta.kind === "page" && (
        <section className="card">
          <h2>Buttons</h2>
          {byButton.length === 0 ? (
            <p className="hint">
              No button clicks recorded in this period.
            </p>
          ) : (
            <BarList rows={byButton} keyName="label" color="#199e70" limit={20} />
          )}
        </section>
      )}

      {showGroups && (
        <section className="card">
          <h2>By group</h2>
          <BarList rows={byGroup} color="#c98500" />
        </section>
      )}

      {!slug && (
        <section className="card">
          <h2>By link</h2>
          {byLink.length === 0 ? (
            <p className="hint">No clicks in this period.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Link</th>
                  <th className="th-bar" aria-hidden="true"></th>
                  <th>Total</th>
                  <th>Android</th>
                  <th>iOS</th>
                  <th>Desktop</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {byLink.map((l) => (
                  <tr key={l.slug}>
                    <td>
                      <strong>{l.label}</strong>{" "}
                      <span className="mono">/{l.slug}</span>
                    </td>
                    <td className="th-bar">
                      <HBar
                        value={l.total}
                        max={Math.max(1, ...byLink.map((x) => x.total))}
                        color="#3987e5"
                      />
                    </td>
                    <td><strong>{l.total}</strong></td>
                    <td>{l.android}</td>
                    <td>{l.ios}</td>
                    <td>{l.desktop}</td>
                    <td>
                      <a className="row-url" href={`/dashboard/stats/${l.slug}`}>Details →</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </main>
  );
}
