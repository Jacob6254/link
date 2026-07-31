// app/layout.js
import "./globals.css";

export const metadata = {
  title: "Mes liens",
  description: "Tous mes réseaux au même endroit",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
