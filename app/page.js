// app/page.js
// Landing publique : présentation du service + connexion.
import LoginForm from "./login-form";
import { IconBolt, IconChart, IconGrid } from "./dashboard/icons";

export const metadata = {
  title: "AllMySocials — links that open the app",
  description:
    "Direct links that open Instagram, TikTok and YouTube in the native app instead of the in-app browser.",
};

const FEATURES = [
  {
    Icon: IconBolt,
    title: "Opens the real app",
    text: "Instagram, TikTok, YouTube, X, Snapchat, Twitch and more open in their native app — not the cramped in-app browser.",
  },
  {
    Icon: IconChart,
    title: "Analytics that matter",
    text: "Clicks by day, country and platform. See which link actually brings people in, and from where.",
  },
  {
    Icon: IconGrid,
    title: "Organised, not messy",
    text: "Group your links, rename groups on the fly, and manage everything from one clean dashboard.",
  },
];

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-head">
        <span className="brand">
          <span className="brand-dot" aria-hidden="true" />
          AllMySocials
        </span>
      </header>

      <main className="landing-main">
        <section className="landing-copy">
          <span className="eyebrow">Link tools for creators</span>
          <h1>
            Direct links that open the app,<br />
            <span className="grad">not the browser.</span>
          </h1>
          <p className="lead">
            Drop one link in your bio. When someone taps it from Instagram or
            TikTok, it lands straight in the native app — no clunky in-app
            browser, no lost followers along the way.
          </p>

          <ul className="features">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <span className="feature-icon"><f.Icon size={17} /></span>
                <div>
                  <strong>{f.title}</strong>
                  <p>{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="landing-form" aria-label="Sign in">
          <LoginForm subtitle="Members only — manage your links and stats." />
        </section>
      </main>

      <footer className="landing-foot">
        <p>© {new Date().getFullYear()} AllMySocials</p>
      </footer>
    </div>
  );
}
