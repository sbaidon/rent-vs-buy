import i18n, { Resources } from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";
import fs from "fs";
import path from "path";

// Helper function to load translations synchronously
const loadTranslations = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resources: Record<string, Record<string, Resources>> = {};
  const supportedLangs = ["en", "es"];
  const namespaces = ["translation"];

  supportedLangs.forEach((lang) => {
    resources[lang] = {};
    namespaces.forEach((ns) => {
      const filePath = path.join(
        process.cwd(),
        "public",
        "locales",
        lang,
        `${ns}.json`
      );
      try {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        resources[lang][ns] = JSON.parse(fileContent);
      } catch (error) {
        console.error(`Failed to load translation file: ${filePath}`, error);
        resources[lang][ns] = {};
      }
    });
  });
  return resources;
};

// Ensure i18n is only initialized once
const i18nInstance = i18n.isInitialized
  ? i18n
  : await i18n
      .use(LanguageDetector)
      .use(Backend)
      .use(initReactI18next)
      .init({
        fallbackLng: "en",
        debug: false,
        supportedLngs: ["en", "es"],
        ns: ["translation"],
        defaultNS: "translation",
        detection: {
          order: ["navigator", "htmlTag"],
          caches: ["localStorage"],
        },
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false,
        },
        backend: {
          loadPath: "/locales/{{lng}}/{{ns}}.json",
          allowMultiLoading: false,
        },
        // Load resources synchronously during SSR
        resources:
          typeof window === "undefined" ? loadTranslations() : undefined,
      });

export default i18nInstance;
