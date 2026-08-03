// lib/deeplink.js
// Dérive automatiquement les deep-links (iOS scheme + Android intent://)
// à partir de l'URL web saisie dans l'admin. Plateforme inconnue -> web uniquement.

const ANDROID_PACKAGES = {
  "instagram.com": "com.instagram.android",
  "tiktok.com": "com.zhiliaoapp.musically",
  "youtube.com": "com.google.android.youtube",
  "youtu.be": "com.google.android.youtube",
  "x.com": "com.twitter.android",
  "twitter.com": "com.twitter.android",
  "snapchat.com": "com.snapchat.android",
  "facebook.com": "com.facebook.katana",
  "twitch.tv": "tv.twitch.android.app",
  "pinterest.com": "com.pinterest",
  "linkedin.com": "com.linkedin.android",
};

// Navigateurs intégrés aux apps (Instagram, TikTok…) : ils piègent l'utilisateur
// dans une webview. On tente d'en sortir vers le navigateur par défaut.
const IN_APP_BROWSERS = [
  [/Instagram/i, "Instagram"],
  [/FBAN|FBAV|FB_IAB|FBIOS/i, "Facebook"],
  [/Messenger/i, "Messenger"],
  [/TikTok|BytedanceWebview|musical_ly|Trill/i, "TikTok"],
  [/Snapchat/i, "Snapchat"],
  [/LinkedInApp/i, "LinkedIn"],
  [/TwitterAndroid|Twitter for/i, "X"],
  [/Pinterest/i, "Pinterest"],
  [/Line\//i, "LINE"],
  [/KAKAOTALK/i, "KakaoTalk"],
  [/GSA\//i, "Google App"],
];

export function detectInAppBrowser(ua = "") {
  for (const [re, name] of IN_APP_BROWSERS) if (re.test(ua)) return name;
  return null;
}

// Intent Android SANS package : demande au système d'ouvrir l'URL avec le
// navigateur par défaut — c'est ce qui fait sortir de la webview d'Instagram.
export function buildBrowserIntent(webUrl) {
  try {
    const u = new URL(webUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return (
      `intent://${u.host}${u.pathname}${u.search}${u.hash}` +
      `#Intent;scheme=${u.protocol.slice(0, -1)};action=android.intent.action.VIEW;` +
      `S.browser_fallback_url=${encodeURIComponent(webUrl)};end`
    );
  } catch {
    return null;
  }
}

// iOS : schéma privé compris par Safari, souvent honoré depuis une webview.
export function buildSafariUrl(webUrl) {
  return /^https?:\/\//i.test(webUrl) ? `x-safari-${webUrl}` : null;
}

function matchHost(hostname) {
  const h = hostname.replace(/^www\./, "").toLowerCase();
  for (const domain of Object.keys(ANDROID_PACKAGES)) {
    if (h === domain || h.endsWith("." + domain)) return domain;
  }
  return null;
}

export function buildDeepLinks(webUrl) {
  let u;
  try {
    u = new URL(webUrl);
  } catch {
    return { iosScheme: null, androidIntent: null };
  }

  const domain = matchHost(u.hostname);
  if (!domain) return { iosScheme: null, androidIntent: null };

  const pkg = ANDROID_PACKAGES[domain];
  const androidIntent =
    `intent://${u.host}${u.pathname}${u.search}` +
    `#Intent;package=${pkg};scheme=https;` +
    `S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;

  // iOS : custom scheme quand il en existe un connu et stable, sinon null (-> web)
  let iosScheme = null;
  const segments = u.pathname.split("/").filter(Boolean);

  if (domain === "instagram.com" && segments[0] && !segments[0].startsWith("p")) {
    iosScheme = `instagram://user?username=${segments[0]}`;
  } else if (domain === "youtube.com" || domain === "youtu.be") {
    iosScheme = `youtube://${u.host}${u.pathname}${u.search}`;
  } else if ((domain === "x.com" || domain === "twitter.com") && segments[0]) {
    iosScheme = `twitter://user?screen_name=${segments[0]}`;
  } else if (domain === "snapchat.com" && segments[0] === "add" && segments[1]) {
    iosScheme = `snapchat://add/${segments[1]}`;
  }
  // TikTok, Facebook, Twitch, Pinterest, LinkedIn : pas de scheme public fiable -> web

  return { iosScheme, androidIntent };
}
