/**
 * Executado no <head> antes do React — resolve idioma da UI (não do conteúdo).
 * Prioridade: prefixo URL → localStorage.lang → navigator → en.
 */
(function () {
  var UI_LOCALES = ['pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'hi'];
  var LANG_KEY = 'lang';
  var HTML_LANG = {
    pt: 'pt-BR',
    en: 'en',
    es: 'es',
    fr: 'fr',
    de: 'de',
    it: 'it',
    ja: 'ja',
    hi: 'hi',
  };

  function matchSupported(code) {
    if (!code) return null;
    var base = String(code).toLowerCase().split('-')[0];
    return UI_LOCALES.indexOf(base) >= 0 ? base : null;
  }

  function fromPathname() {
    var seg = location.pathname.split('/').filter(Boolean)[0];
    if (!seg || seg === 'pt' || UI_LOCALES.indexOf(seg) < 0) return null;
    return seg;
  }

  function resolveUiLocale() {
    var fromPath = fromPathname();
    if (fromPath) return fromPath;
    try {
      var stored = matchSupported(localStorage.getItem(LANG_KEY));
      if (stored) return stored;
    } catch (e) {}
    var langs = [navigator.language].concat(
      navigator.languages ? Array.prototype.slice.call(navigator.languages) : []
    );
    for (var i = 0; i < langs.length; i++) {
      var nav = matchSupported(langs[i]);
      if (nav) return nav;
    }
    return 'en';
  }

  try {
    var locale = resolveUiLocale();
    window.__MM_UI_LOCALE__ = locale;
    document.documentElement.lang = HTML_LANG[locale] || locale;
  } catch (e) {
    window.__MM_UI_LOCALE__ = 'en';
    document.documentElement.lang = 'en';
  }
})();
