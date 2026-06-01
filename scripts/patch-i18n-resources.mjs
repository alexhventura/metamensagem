import fs from 'fs';

let i18n = fs.readFileSync('src/i18n.ts', 'utf8');

if (!i18n.includes('extraLocales')) {
  i18n = i18n.replace(
    "import LanguageDetector from 'i18next-browser-languagedetector';",
    "import LanguageDetector from 'i18next-browser-languagedetector';\nimport { de, hi, it, ja } from './i18n/extraLocales';"
  );
}

if (!i18n.includes('  de,')) {
  i18n = i18n.replace(/\n};\n\ni18n/, ',\n  de,\n  it,\n  ja,\n  hi,\n};\n\ni18n');
}

const menuPt = `
      "translate_menu": {
        "language": "Idioma",
        "translating": "Traduzindo...",
        "unavailable": "Tradução indisponível",
        "success": "✓ Traduzido para {{lang}}",
        "original": "Ver original",
        "retry": "Tentar novamente"
      },`;

if (!i18n.includes('translate_menu')) {
  i18n = i18n.replace(
    '"translate": "Traduzir"\n      },\n      "editor":',
    `"translate": "Traduzir"\n      },${menuPt}\n      "editor":`
  );
  i18n = i18n.replace(
    '"translate": "Translate"\n      },\n      "editor": {\n        "title": "Generate Premium Post"',
    `"translate": "Translate"\n      },\n      "translate_menu": {\n        "language": "Language",\n        "translating": "Translating...",\n        "unavailable": "Translation unavailable",\n        "success": "✓ Translated to {{lang}}",\n        "original": "View original",\n        "retry": "Try again"\n      },\n      "editor": {\n        "title": "Generate Premium Post"`
  );
  i18n = i18n.replace(
    '"translate": "Traducir"\n      },\n      "editor": {\n        "title": "Generar Post Premium"',
    `"translate": "Traducir"\n      },\n      "translate_menu": {\n        "language": "Idioma",\n        "translating": "Traduciendo...",\n        "unavailable": "Traducción no disponible",\n        "success": "✓ Traducido al {{lang}}",\n        "original": "Ver original",\n        "retry": "Intentar de nuevo"\n      },\n      "editor": {\n        "title": "Generar Post Premium"`
  );
  i18n = i18n.replace(
    '"translate": "Traduire"\n      },\n      "editor": {\n        "title": "Générer un Post Premium"',
    `"translate": "Traduire"\n      },\n      "translate_menu": {\n        "language": "Langue",\n        "translating": "Traduction en cours...",\n        "unavailable": "Traduction indisponible",\n        "success": "✓ Traduit en {{lang}}",\n        "original": "Voir l'original",\n        "retry": "Réessayer"\n      },\n      "editor": {\n        "title": "Générer un Post Premium"`
  );
}

if (!i18n.includes('supportedLngs')) {
  i18n = i18n.replace(
    'fallbackLng: \'pt\',',
    `fallbackLng: 'pt',
    supportedLngs: ['pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'hi'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },`
  );
}

fs.writeFileSync('src/i18n.ts', i18n);
console.log('patch-i18n-resources OK');
