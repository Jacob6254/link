// lib/escape.js
// Sortie du navigateur intégré (Instagram, TikTok…) vers le navigateur externe
// du téléphone. Injecté tel quel dans les pages publiques.
//
// La bonne méthode dépend de l'app qui piège l'utilisateur :
//
//   • Instagram / Threads (iOS) : "instagram://extbrowser/?url=<dest>".
//     C'est un schéma d'Instagram lui-même — on demande à l'app d'ouvrir le
//     lien dans le navigateur externe. C'est LA seule méthode fiable ; elle
//     réussit là où x-safari-https échoue depuis que Meta l'a bloqué (2026).
//
//   • Autres webviews iOS : "x-safari-https://…" en location.href.
//
//   • Android : intent:// avec package=com.android.chrome, plus un fallback
//     web inclus dans l'intent lui-même.
//
// Dans TOUS les cas un minuteur ramène sur la destination si rien ne s'est
// passé : un bouton ne doit jamais rester sans effet.

export const ESCAPE_FN = `
function amsEscape(dest, opts) {
  opts = opts || {};
  var ua = navigator.userAgent || "";
  var low = ua.toLowerCase();
  var isIOS = /iphone|ipad|ipod/.test(low) ||
    (low.indexOf("macintosh") >= 0 && "ontouchend" in document);
  var isAndroid = /android/.test(low);

  // Instagram et Threads partagent le même schéma d'ouverture externe.
  var isMessenger = low.indexOf("messenger") >= 0 ||
    low.indexOf("fban") >= 0 || low.indexOf("fbav") >= 0;
  var isThreads = !isMessenger && low.indexOf("barcelona") >= 0;
  var isInstagram = !isMessenger &&
    (low.indexOf("instagram") >= 0 || low.indexOf("iabmv") >= 0 || isThreads);

  var timer = null;
  function later(fn, ms) { clearTimeout(timer); timer = setTimeout(fn, ms); }
  function giveUp() { window.location.href = dest; }
  function armFallback(ms) {
    later(function () { if (!document.hidden) giveUp(); }, ms || 1500);
  }

  try {
    // 1) Instagram / Threads : le schéma de l'app, la méthode qui marche.
    if (isIOS && isInstagram && opts.extBrowser) {
      window.location.replace(opts.extBrowser + encodeURIComponent(dest));
      armFallback(2000);
      return true;
    }

    // 2) Android : on passe par un intent visant le navigateur.
    if (isAndroid) {
      var u = new URL(dest);
      window.location.href =
        "intent://" + u.host + u.pathname + u.search +
        "#Intent;scheme=" + u.protocol.replace(":", "") +
        ";package=com.android.chrome" +
        ";S.browser_fallback_url=" + encodeURIComponent(dest) + ";end";
      armFallback(1500);
      return true;
    }

    // 3) Autres webviews iOS : le schéma Safari historique.
    if (isIOS) {
      var s = new URL(dest);
      window.location.href = "x-safari-https://" + s.host + s.pathname + s.search;
      later(giveUp, 1500);
      return true;
    }
  } catch (e) {}

  // 4) Cas non couvert : navigation normale, immédiatement.
  giveUp();
  return true;
}
`;

// Webviews intégrées où l'échappement a du sens.
export const IN_APP_RE =
  String.raw`/Instagram|IABMV|Barcelona|FBAN|FBAV|FB_IAB|FBIOS|Messenger|TikTok|BytedanceWebview|musical_ly|Trill|Snapchat|LinkedInApp|Pinterest|Line\/|KAKAOTALK/i`;

export const IS_IOS_JS = `(/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))`;

// Schéma d'ouverture externe d'Instagram, encodé pour ne pas apparaître en
// clair dans le HTML (Meta bloque ce qu'il détecte).
export const EXT_BROWSER_B64 = "aW5zdGFncmFtOi8vZXh0YnJvd3Nlci8/dXJsPQ==";
