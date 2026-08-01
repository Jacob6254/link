// app/admin/page.js
// Ancienne adresse : redirige vers la gestion des profils du dashboard.
import { redirect } from "next/navigation";

export default function Admin() {
  redirect("/dashboard/profiles");
}
