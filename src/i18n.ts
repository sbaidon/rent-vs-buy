import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translations directly - bundled at build time
// This ensures translations are available immediately on both server and client
import enTranslation from "../public/locales/en/translation.json";
import esTranslation from "../public/locales/es/translation.json";
import frTranslation from "../public/locales/fr/translation.json";
import deTranslation from "../public/locales/de/translation.json";
import itTranslation from "../public/locales/it/translation.json";

// Bundled resources - no async loading needed
const bundledResources = {
  en: { translation: enTranslation },
  es: { translation: esTranslation },
  fr: { translation: frTranslation },
  de: { translation: deTranslation },
  it: { translation: itTranslation },
};

const isServer = typeof window === "undefined";

// Initialize i18n synchronously with bundled resources
// This prevents the "blink" where translations load async on client
if (!i18n.isInitialized) {
  // Always use initReactI18next
  i18n.use(initReactI18next);
  
  // Only use language detector on client
  if (!isServer) {
    i18n.use(LanguageDetector);
  }

  i18n.init({
    fallbackLng: "en",
    debug: false,
    supportedLngs: ["en", "es", "fr", "de", "it"],
    ns: ["translation"],
    defaultNS: "translation",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    // Use bundled resources on both server and client for instant availability
    resources: bundledResources,
    // Language detection settings (only active on client)
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
  });
}

export default i18n;
