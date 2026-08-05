// app/dashboard/sidebar.js
"use client";
import { usePathname } from "next/navigation";
import { IconChart, IconLink, IconPower, IconUsers } from "./icons";

const NAV = [
  { href: "/dashboard/links", label: "Links", Icon: IconLink, match: ["/dashboard/links", "/dashboard/pages"] },
  { href: "/dashboard/stats", label: "Analytics", Icon: IconChart, match: ["/dashboard/stats"] },
];

const ADMIN_NAV = [
  { href: "/dashboard/profiles", label: "Profiles", Icon: IconUsers, match: ["/dashboard/profiles"] },
];

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
        {items.map(({ href, label, Icon, match }) => {
          const active = match.some((m) => pathname.startsWith(m));
          return (
            <a key={href} href={href} className={active ? "nav-item active" : "nav-item"}>
              <Icon className="ico" size={18} />
              <span className="nav-label">{label}</span>
            </a>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <div className="sidebar-user">
          <span className="user-avatar" aria-hidden="true">
            {(username[0] || "?").toUpperCase()}
          </span>
          <span className="nav-label user-name">{username}</span>
          <a className="logout-icon" href="/api/logout" title="Sign out">
            <IconPower className="ico" size={17} />
          </a>
        </div>
      </div>
    </aside>
  );
}
