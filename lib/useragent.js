// lib/useragent.js
// Analyse du user-agent : plateforme, type d'appareil, OS, et détection des
// robots (indispensable : sans ça un simple partage sur Discord ou Facebook
// gonfle les statistiques avec des visites qui n'existent pas).

const BOTS =
  /bot\b|crawler|spider|crawl|slurp|facebookexternalhit|discordbot|slackbot|telegrambot|twitterbot|linkedinbot|whatsapp|pinterestbot|redditbot|embedly|quora link preview|showyoubot|outbrain|vkshare|w3c_validator|skypeuripreview|applebot|googlebot|bingbot|yandex|duckduckbot|baiduspider|semrush|ahrefs|mj12|dotbot|petalbot|headless|phantomjs|puppeteer|playwright|lighthouse|pingdom|uptimerobot|gtmetrix|curl\/|wget\/|python-requests|axios\/|go-http-client|okhttp|java\/|libwww|httpclient|postman|insomnia/i;

export function isBot(ua = "") {
  if (!ua.trim()) return true; // aucun user-agent : jamais un vrai navigateur
  return BOTS.test(ua);
}

export function detectPlatform(ua = "") {
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "desktop";
}

export function detectDevice(ua = "") {
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

export function detectOS(ua = "") {
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/linux|x11/i.test(ua)) return "Linux";
  return "Unknown";
}
