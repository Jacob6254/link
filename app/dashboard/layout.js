// app/dashboard/layout.js
// Layout de l'espace membre : sidebar de navigation + contenu.
// Le middleware garantit qu'on est connecté ici.
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import Sidebar from "./sidebar";

export const metadata = { title: "Dashboard — Mes liens" };

export default async function DashboardLayout({ children }) {
  const token = (await cookies()).get("session")?.value;
  const session = token ? await verifySession(token) : null;

  return (
    <div className="dash">
      <Sidebar
        role={session?.role || "viewer"}
        username={session?.username || ""}
      />
      <div className="dash-content">{children}</div>
    </div>
  );
}
