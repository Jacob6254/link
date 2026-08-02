import "./globals.css";

export const metadata = {
  title: "AllMySocials",
  description: "Short links that open the native app instead of the in-app browser.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
