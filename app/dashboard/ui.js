// app/dashboard/ui.js
"use client";
// Briques d'interface partagées par les écrans du dashboard.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ===== Loader animé (logo qui pulse) =====
export function Loader({ label = "Loading" }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="loader-orb" aria-hidden="true">
        <span className="loader-ring" />
        <span className="loader-ring" />
        <span className="loader-core" />
      </span>
      <span className="loader-label">{label}</span>
    </div>
  );
}

// ===== Menu d'actions (⋮) =====
// Rendu via un portail en position fixe : il ne peut donc jamais être rogné
// par l'overflow d'une carte parente.
export function RowMenu({ children, label = "Actions" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    function place() {
      const r = btnRef.current.getBoundingClientRect();
      const popH = popRef.current?.offsetHeight || 240;
      const popW = popRef.current?.offsetWidth || 180;
      const below = window.innerHeight - r.bottom;
      const top = below > popH + 12 ? r.bottom + 6 : Math.max(8, r.top - popH - 6);
      const left = Math.min(
        Math.max(8, r.right - popW),
        window.innerWidth - popW - 8
      );
      setPos({ top, left });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (btnRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        className="icon-btn"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ⋮
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popRef}
            className="menu-pop"
            style={pos ? { top: pos.top, left: pos.left } : { opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
}

// ===== Modale =====
export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    function onEsc(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="backdrop" onMouseDown={onClose}>
      <div
        className={wide ? "modal modal-wide" : "modal"}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

// ===== Toast =====
export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`toast ${toast.kind === "err" ? "toast-err" : ""}`} role="status">
      {toast.message}
    </div>
  );
}

// ===== Sélecteur de période =====
export const RANGE_PRESETS = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "365d", label: "1 year", days: 365 },
];

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoISO(n) {
  return new Date(Date.now() - (n - 1) * 86400000).toISOString().slice(0, 10);
}

export function RangePicker({ range, onChange }) {
  const [custom, setCustom] = useState(false);

  return (
    <div className="range-picker">
      <div className="range-presets">
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.key}
            className={!custom && range.preset === p.key ? "range-btn active" : "range-btn"}
            onClick={() => {
              setCustom(false);
              onChange({ preset: p.key, from: daysAgoISO(p.days), to: todayISO() });
            }}
          >
            {p.label}
          </button>
        ))}
        <button
          className={custom ? "range-btn active" : "range-btn"}
          onClick={() => setCustom((c) => !c)}
        >
          Custom
        </button>
      </div>
      {custom && (
        <div className="range-custom">
          <input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => onChange({ ...range, preset: "custom", from: e.target.value })}
          />
          <span className="hint">to</span>
          <input
            type="date"
            value={range.to}
            min={range.from}
            max={todayISO()}
            onChange={(e) => onChange({ ...range, preset: "custom", to: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
