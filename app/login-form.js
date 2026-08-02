// app/login-form.js
"use client";
// Formulaire de connexion partagé entre la landing (/) et /login.
import { useState } from "react";

export default function LoginForm({ title = "Sign in", subtitle }) {
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
      setError(data.error || "Sign-in failed");
      return;
    }
    // Retour vers la page demandée (?next=/dashboard/stats), sinon le dashboard.
    const next = new URLSearchParams(window.location.search).get("next");
    const safe =
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    window.location.href = safe;
  }

  return (
    <div className="signin-card">
      <h2>{title}</h2>
      {subtitle && <p className="hint signin-sub">{subtitle}</p>}
      <label className="field">
        <span>Username</span>
        <input
          placeholder="yourname"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
        />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
        />
      </label>
      <button onClick={login} disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
