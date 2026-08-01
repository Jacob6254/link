// app/login/page.js
"use client";
// Page de connexion : identifiant + mot de passe.
import { useState } from "react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setError("");
    setLoading(true);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erreur de connexion");
      return;
    }
    // Retour vers la page demandée (?next=/dashboard/stats), sinon le dashboard.
    const next = new URLSearchParams(window.location.search).get("next");
    const safe =
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    window.location.href = safe;
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-logo" aria-hidden="true">⛓</div>
        <h1>Connexion</h1>
        <p className="hint">Espace membre — gérez vos liens et vos stats.</p>
        <input
          placeholder="Identifiant"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
        />
        <button onClick={login} disabled={loading}>
          {loading ? "Connexion…" : "Se connecter"}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}
