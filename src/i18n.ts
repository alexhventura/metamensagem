import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { de, hi, it, ja } from './i18n/extraLocales';
import { resolveUiLocale, uiLocaleFromPathname } from './lib/uiLocale';

const pathLocaleDetector = {
  name: 'path',
  lookup() {
    if (typeof window === 'undefined') return undefined;
    return uiLocaleFromPathname(window.location.pathname) ?? undefined;
  },
};

LanguageDetector.addDetector(pathLocaleDetector);

const resources = {
  pt: {
    translation: {
      "app": {
        "title": "Metamensagem",
        "tagline": "Mente, Mensagem e Mudança.",
        "tagline_before": "Mente, Mensagem e",
        "tagline_highlight": "Mudança.",
        "slogan": "Palavras que atravessam fronteiras e aproximam pessoas."
      },
      "nav": {
        "home": "Início",
        "quotes": "Frases",
        "metaforas": "Metáforas",
        "about": "Sobre",
        "contact": "Contato",
        "privacy": "Privacidade",
        "terms": "Termos",
        "cookies": "Cookies"
      },
      "home": {
        "search_placeholder": "Qual sentimento ou tema busca hoje?",
        "explore_more": "Explorar mais Sabedoria (+10)",
        "sharing_wisdom": "Sincronizando Sabedoria Edge..."
      },
      "frases": {
        "collection_title": "Coleção de Frases",
        "page_title": "Banco Total de Frases",
        "page_description": "Explore milhares de insights e citações curtas catalogadas para status, redes sociais e reflexão.",
        "search_placeholder": "Buscar frase ou autor...",
        "count_available": "{{count}} {{label}} disponíveis",
        "count_filtered": "{{visible}} de {{count}} {{label}} disponíveis"
      },
      "metaforas": {
        "collection_title": "Arquivo de Metáforas",
        "page_title": "Índice de Metáforas Terapêuticas",
        "page_description": "Contos e narrativas profundas focadas em psicologia aplicada, insights inconscientes e reprogramação de atitudes.",
        "search_placeholder": "Encontrar metáfora..."
      },
      "banner": {
        "title": "Receba novas frases e metáforas todos os dias",
        "subtitle": "Siga @metamensagem e acompanhe conteúdos exclusivos.",
        "button": "Seguir no Instagram"
      },
      "common": {
        "author": "POR",
        "copy": "Copiar",
        "share": "Compartilhar",
        "edit_image": "Editar Imagem",
        "generate_image": "Gerar Imagem",
        "read": "Ler",
        "read_metaphor": "Ler Metáfora",
        "learn_more": "Saiba mais",
        "download": "Download",
        "copied": "Copiado!",
        "link_copied": "Link copiado!",
        "translate": "Traduzir"
      },
      "translate_menu": {
        "language": "Idioma",
        "translating": "Traduzindo...",
        "unavailable": "Tradução indisponível",
        "success": "✓ Traduzido para {{lang}}",
        "original": "Ver original",
        "retry": "Tentar novamente"
      },
      "editor": {
        "title": "Gerar Post Premium",
        "controls": "Controles de Arte",
        "background": "Cor de Fundo",
        "font_size": "Tamanho da Fonte",
        "text_color": "Cor do Texto",
        "weight": "Peso da Fonte",
        "alignment": "Alinhamento",
        "reset": "Resetar",
        "format": "Formato",
        "square": "Quadrado (1:1)",
        "portrait": "Retrato (4:5)",
        "story": "Story (9:16)",
        "preparing": "Preparando sua imagem...",
        "share_instagram": "Compartilhar no Instagram",
        "share_whatsapp": "Enviar para WhatsApp",
        "wait_ad": "Aguarde {{seconds}} segundos para liberar o download...",
        "download_ready": "Seu download está pronto!",
        "share_social": "Compartilhar nas Redes"
      }
    }
  },
  en: {
    translation: {
      "app": {
        "title": "Metamensagem",
        "tagline": "Mind, Message and Change.",
        "tagline_before": "Mind, Message and",
        "tagline_highlight": "Change.",
        "slogan": "Words that cross borders and bring people closer."
      },
      "nav": {
        "home": "Home",
        "quotes": "Quotes",
        "metaforas": "Metaphors",
        "about": "About",
        "contact": "Contact",
        "privacy": "Privacy",
        "terms": "Terms"
      },
      "home": {
        "search_placeholder": "What feeling or theme are you looking for today?",
        "explore_more": "Explore more Wisdom (+10)",
        "sharing_wisdom": "Synchronizing Edge Wisdom..."
      },
      "frases": {
        "collection_title": "Quote Collection",
        "page_title": "Full Quote Library",
        "page_description": "Explore thousands of short insights and quotes for social media and reflection.",
        "search_placeholder": "Search quote or author...",
        "count_available": "{{count}} {{label}} available",
        "count_filtered": "{{visible}} of {{count}} {{label}} available"
      },
      "metaforas": {
        "collection_title": "Metaphor Archive",
        "page_title": "Therapeutic Metaphors Index",
        "page_description": "Deep stories focused on applied psychology and attitude change.",
        "search_placeholder": "Find a metaphor..."
      },
      "banner": {
        "title": "Receive new quotes and metaphors every day",
        "subtitle": "Follow @metamensagem and follow exclusive content.",
        "button": "Follow on Instagram"
      },
      "common": {
        "author": "BY",
        "copy": "Copy",
        "share": "Share",
        "edit_image": "Edit Image",
        "generate_image": "Generate Image",
        "read": "Read",
        "read_metaphor": "Read Metaphor",
        "learn_more": "Learn more",
        "download": "Download",
        "copied": "Copied!",
        "link_copied": "Link copied!",
        "translate": "Translate"
      },
      "translate_menu": {
        "language": "Language",
        "translating": "Translating...",
        "unavailable": "Translation unavailable",
        "success": "✓ Translated to {{lang}}",
        "original": "View original",
        "retry": "Try again"
      },
      "editor": {
        "title": "Generate Premium Post",
        "controls": "Art Controls",
        "background": "Background",
        "font_size": "Font Size",
        "text_color": "Text Color",
        "contrast": "Contrast",
        "blur": "Blur",
        "upload_image": "Change Background Image",
        "reset": "Reset"
      }
    }
  },
  es: {
    translation: {
      "app": {
        "title": "Metamensagem",
        "tagline": "Mente, Mensaje y Cambio.",
        "tagline_before": "Mente, Mensaje y",
        "tagline_highlight": "Cambio.",
        "slogan": "Palabras que cruzan fronteras y acercan personas."
      },
      "nav": {
        "home": "Inicio",
        "quotes": "Frases",
        "metaforas": "Metáforas",
        "about": "Sobre",
        "contact": "Contacto",
        "privacy": "Privacidad",
        "terms": "Términos"
      },
      "home": {
        "search_placeholder": "¿Qué sentimiento o tema buscas hoy?",
        "explore_more": "Explorar más Sabiduría (+10)",
        "sharing_wisdom": "Sincronizando Sabiduría Edge..."
      },
      "banner": {
        "title": "Recibe nuevas frases y metáforas todos los días",
        "subtitle": "Sigue a @metamensagem y acompaña contenidos exclusivos.",
        "button": "Seguir en Instagram"
      },
      "common": {
        "author": "POR",
        "copy": "Copiar",
        "share": "Compartir",
        "edit_image": "Editar Imagen",
        "generate_image": "Generar Imagen",
        "read": "Leer",
        "read_metaphor": "Leer Metáfora",
        "learn_more": "Saber más",
        "download": "Descargar",
        "copied": "¡Copiado!",
        "link_copied": "¡Enlace copiado!",
        "translate": "Traducir"
      },
      "translate_menu": {
        "language": "Idioma",
        "translating": "Traduciendo...",
        "unavailable": "Traducción no disponible",
        "success": "✓ Traducido al {{lang}}",
        "original": "Ver original",
        "retry": "Intentar de nuevo"
      },
      "editor": {
        "title": "Generar Post Premium",
        "controls": "Controles de Arte",
        "background": "Fondo",
        "font_size": "Tamaño de Fuente",
        "text_color": "Color de Texto",
        "contrast": "Contraste",
        "blur": "Desenfoque",
        "upload_image": "Cambiar Imagen de Fondo",
        "reset": "Reiniciar"
      }
    }
  },
  fr: {
    translation: {
      "app": {
        "title": "Metamensagem",
        "tagline": "Esprit, Message et Changement.",
        "tagline_before": "Esprit, Message et",
        "tagline_highlight": "Changement.",
        "slogan": "Des mots qui traversent les frontières et rapprochent les gens."
      },
      "nav": {
        "home": "Accueil",
        "quotes": "Citations",
        "metaforas": "Métaphores",
        "about": "À propos",
        "contact": "Contact",
        "privacy": "Confidentialité",
        "terms": "Conditions"
      },
      "home": {
        "search_placeholder": "Quel sentiment ou thème cherchez-vous aujourd'hui ?",
        "explore_more": "Explorer plus de Sagesse (+10)",
        "sharing_wisdom": "Synchronisation de la Sagesse Edge..."
      },
      "banner": {
        "title": "Recevez de nouvelles citations et métaphores chaque jour",
        "subtitle": "Suivez @metamensagem et suivez des contenus exclusifs.",
        "button": "Suivre sur Instagram"
      },
      "common": {
        "author": "PAR",
        "copy": "Copier",
        "share": "Partager",
        "edit_image": "Modifier l'image",
        "generate_image": "Générer une image",
        "read": "Lire",
        "read_metaphor": "Lire la Métaphore",
        "learn_more": "En savoir plus",
        "download": "Télécharger",
        "copied": "Copié !",
        "link_copied": "Lien copié !",
        "translate": "Traduire"
      },
      "translate_menu": {
        "language": "Langue",
        "translating": "Traduction en cours...",
        "unavailable": "Traduction indisponible",
        "success": "✓ Traduit en {{lang}}",
        "original": "Voir l'original",
        "retry": "Réessayer"
      },
      "editor": {
        "title": "Générer un Post Premium",
        "controls": "Contrôles d'Art",
        "background": "Arrière-plan",
        "font_size": "Taille de la police",
        "text_color": "Couleur du texte",
        "contrast": "Contraste",
        "blur": "Flou",
        "upload_image": "Changer l'image de fond",
        "reset": "Réinitialiser"
      }
    }
  },
  de,
  it,
  ja,
  hi,
};

const initialUiLocale =
  typeof window !== 'undefined' ? resolveUiLocale(window.location.pathname) : 'en';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: initialUiLocale,
    fallbackLng: 'en',
    supportedLngs: ['pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'hi'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['path', 'localStorage', 'navigator'],
      lookupLocalStorage: 'lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
