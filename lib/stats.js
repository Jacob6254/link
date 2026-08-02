// lib/stats.js
// Agrégations partagées par les écrans d'analytics.

export function detectOS(ua = "") {
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/linux|x11/i.test(ua)) return "Linux";
  return "Unknown";
}

const SOURCES = [
  [/instagram\./i, "Instagram"],
  [/tiktok\./i, "TikTok"],
  [/(^|\.)(twitter|x)\.com/i, "X"],
  [/t\.co$/i, "X"],
  [/facebook\.|fb\./i, "Facebook"],
  [/youtube\.|youtu\.be/i, "YouTube"],
  [/snapchat\./i, "Snapchat"],
  [/reddit\./i, "Reddit"],
  [/google\./i, "Google"],
  [/bing\./i, "Bing"],
  [/linkedin\./i, "LinkedIn"],
  [/twitch\./i, "Twitch"],
  [/telegram\.|t\.me$/i, "Telegram"],
  [/discord\./i, "Discord"],
];

export function detectSource(referrer, selfHost = "") {
  if (!referrer) return "Direct";
  let host;
  try {
    host = new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return "Other";
  }
  // Clic depuis une de nos propres pages bio : ce n'est pas une source externe.
  if (selfHost && host === selfHost.replace(/^www\./, "")) return "Your pages";
  for (const [re, name] of SOURCES) if (re.test(host)) return name;
  return host || "Other";
}

// Liste continue de jours "YYYY-MM-DD" entre deux bornes incluses.
export function dayRange(from, to) {
  const days = [];
  const cur = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cur <= end && days.length < 400) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

// Convertit un objet {clé: total} en tableau trié décroissant.
export function toSorted(counts, keyName = "name") {
  return Object.entries(counts)
    .map(([k, total]) => ({ [keyName]: k, total }))
    .sort((a, b) => b.total - a.total);
}
