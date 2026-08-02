// app/dashboard/sidebar.js
"use client";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard/links", label: "My links", icon: "🔗" },
  { href: "/dashboard/groups", label: "Groups", icon: "🗂️" },
  { href: "/dashboard/stats", label: "Analytics", icon: "📊" },
];

const ADMIN_NAV = [{ href: "/dashboard/profiles", label: "Profiles", icon: "👥" }];

export default function Sidebar({ role, username }) {
  const pathname = usePathname();
  const items = role === "admin" ? [...NAV, ...ADMIN_NAV] : NAV;

  return (
    <aside className="sidebar">
      <a className="sidebar-brand" href="/dashboard">
        <span className="brand-dot" aria-hidden="true" />
        <span className="brand-name">AllMySocials</span>
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
          <a className="logout-icon" href="/api/logout" title="Sign out">⏻</a>
        </div>
      </div>
    </aside>
  );
}
