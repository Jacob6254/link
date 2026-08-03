// lib/escape.js
// Sortie du navigateur intégré (Instagram, TikTok…) vers le navigateur du
// téléphone. Injecté tel quel dans les pages publiques.
//
// État des lieux iOS (août 2026) — aucune méthode n'est officielle, Apple n'en
// fournit pas, et Meta bloque activement :
//   • x-safari-https:// : cassé sur Instagram depuis mars 2026, et il n'a
//     jamais été honoré que via window.open() — jamais via location.href.
//   • googlechromes:// : toujours accepté, ouvre Chrome s'il est installé.
// On tente donc les deux en cascade, DANS le geste du clic (sans user gesture,
// WKWebView refuse tout changement de schéma).
export const ESCAPE_FN = `
function amsEscape(full, fallback) {
  var left = false;
  function gone() { left = true; }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) gone();
  }, { once: true });
  window.addEventListener("pagehide", gone, { once: true });

  var bare = full.replace(/^https?:\\/\\//, "");
  var secure = full.indexOf("https:") === 0;

  // Schémas des navigateurs iOS. Un schéma non installé ne fait rien du tout
  // (aucune erreur), donc on les enchaîne : le premier installé l'emporte.
  var browsers = [
    secure ? "googlechromes://" + bare : "googlechrome://" + bare,
    "firefox://open-url?url=" + encodeURIComponent(full),
    "microsoft-edge-" + full,
    secure ? "touch-https://" + bare : "touch-http://" + bare,
    "opera-" + full
  ];

  // 1) Safari — uniquement via window.open, jamais via location.href.
  try { window.open("x-safari-" + full, "_blank"); } catch (e) {}

  // 2) Les navigateurs tiers, l'un après l'autre.
  browsers.forEach(function (url, i) {
    setTimeout(function () {
      if (left) return;
      try { window.location.href = url; } catch (e) {}
    }, 300 + i * 260);
  });

  // 3) Rien n'a marché : on suit le lien normalement.
  if (fallback) {
    var last = 300 + browsers.length * 260 + 400;
    setTimeout(function () { if (!left) window.location.href = fallback; }, last);
  }
  return true;
}
`;

// Vrai pour les webviews intégrées où l'échappement a du sens.
export const IN_APP_RE =
  String.raw`/Instagram|FBAN|FBAV|FB_IAB|FBIOS|Messenger|TikTok|BytedanceWebview|musical_ly|Trill|Snapchat|LinkedInApp|Pinterest|Line\/|KAKAOTALK/i`;

export const IS_IOS_JS = `(/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))`;
