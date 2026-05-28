/**
 * Executado no <head> antes do React — evita flash e garante tema após F5.
 * Mantém localStorage.theme + cookie mm_theme em sincronia.
 */
(function () {
  var KEY = 'theme';
  var COOKIE = 'mm_theme';

  function norm(v) {
    if (!v) return null;
    v = String(v).trim().toLowerCase();
    if (v === 'claro') return 'light';
    if (v === 'escuro') return 'dark';
    return v === 'light' || v === 'dark' ? v : null;
  }

  function fromCookie() {
    var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=(light|dark)\\b'));
    return m ? m[1] : null;
  }

  function writeCookie(t) {
    var secure = location.protocol === 'https:' ? ';Secure' : '';
    document.cookie = COOKIE + '=' + t + ';path=/;max-age=31536000;SameSite=Lax' + secure;
  }

  try {
    var t = norm(localStorage.getItem(KEY)) || fromCookie();
    if (!t) {
      t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } else {
      localStorage.setItem(KEY, t);
      writeCookie(t);
    }
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
