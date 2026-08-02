// app/login/page.js
// Page de connexion dédiée (utilisée quand le middleware redirige avec ?next=).
import LoginForm from "../login-form";

export const metadata = { title: "Sign in — AllMySocials" };

export default function Login() {
  return (
    <main className="login-page">
      <a className="brand login-brand" href="/">
        <span className="brand-dot" aria-hidden="true" />
        AllMySocials
      </a>
      <LoginForm subtitle="Sign in to manage your links and stats." />
    </main>
  );
}
