// app/dashboard/sidebar.js
"use client";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard/links", label: "Mes liens", icon: "🔗" },
  { href: "/dashboard/groups", label: "Groupes", icon: "🗂️" },
  { href: "/dashboard/stats", label: "Statistiques", icon: "📊" },
];

const ADMIN_NAV = [
  { href: "/dashboard/profiles", label: "Profils", icon: "👥" },
  { href: "/dashboard/settings", label: "Réglages", icon: "⚙️" },
];

export default function Sidebar({ role, username }) {
  const pathname = usePathname();
  const items = role === "admin" ? [...NAV, ...ADMIN_NAV] : NAV;

  return (
    <aside className="sidebar">
      <a className="sidebar-brand" href="/dashboard">
        <span className="brand-dot" aria-hidden="true" />
        <span className="brand-name">Mes liens</span>
      </a>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={pathname.startsWith(item.href) ? "nav-item active" : "nav-item"}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="sidebar-user">
          <span className="user-avatar" aria-hidden="true">
            {(username[0] || "?").toUpperCase()}
          </span>
          <span className="nav-label user-name">{username}</span>
          <a className="logout-icon" href="/api/logout" title="Se déconnecter">⏻</a>
        </div>
      </div>
    </aside>
  );
}
