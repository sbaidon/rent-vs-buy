import "./i18n";

import { CalculatorProvider } from "./context/calculator-context";
import { Monitoring } from "react-scan/monitoring";
import { PostHogProvider } from "posthog-js/react";
import { Head } from "vike-react/Head"; // or vike-vue / vike-solid
import {
  AppProvider,
  Country,
  Currency,
  useAppContext,
} from "./context/app-context";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import posthog from "posthog-js";

function Navbar() {
  const { setCurrency, setSelectedCountry, country, currency } =
    useAppContext();
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      className="flex justify-end p-6 sticky lg:relative top-0 isolate z-1"
      ref={menuRef}
    >
      <button
        className="lg:hidden text-white p-2 sticky top-0"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label={t("toggle_menu")}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Desktop menu */}
      <div
        className={`isolate 
        flex-col gap-4 absolute right-6 top-[72px] p-4 lg:p-0 w-48 rounded-lg shadow-lg
        lg:w-auto lg:static lg:flex-row lg:bg-transparent lg:shadow-none
        lg:flex ${isMenuOpen ? "flex bg-amber-950" : "hidden"}
      `}
      >
        <div className="flex flex-col lg:flex-row lg:gap-4">
          <select
            id="currency-select"
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="mb-4 lg:mb-0 px-3 py-1 rounded text-white cursor-pointer"
            aria-label={t("currency")}
            value={currency}
          >
            <option value="USD">{t("currency_usd")} ($)</option>
            <option value="EUR">{t("currency_eur")} (€)</option>
            <option value="MXN">{t("currency_mxn")} ($)</option>
          </select>

          <select
            id="language-select"
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="mb-4 lg:mb-0 px-3 py-1 rounded text-white cursor-pointer"
            value={i18n.language}
            aria-label={t("language")}
          >
            <option value="en">{t("language_english")}</option>
            <option value="es">{t("language_spanish")}</option>
          </select>

          <div className="relative">
            <select
              id="country-select"
              className="mb-4 lg:mb-0 px-3 py-1 rounded text-white cursor-pointer"
              aria-label={t("country")}
              onChange={(e) => setSelectedCountry(e.target.value as Country)}
              value={country}
            >
              <option value="US">🇺🇸 {t("country_united_states")}</option>
              <option value="CA">🇨🇦 {t("country_canada")}</option>
              <option value="MX">🇲🇽 {t("country_mexico")}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  capture_pageview: true,
};

function Layout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, options);
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <Head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no"
        />
        <meta name="HandheldFriendly" content="true" />
        <meta name="MobileOptimized" content="width" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Texturina:ital,opsz,wght@0,12..72,100..900;1,12..72,100..900&display=swap"
          rel="stylesheet"
        />
      </Head>
      <AppProvider>
        <CalculatorProvider>
          <div className="min-h-screen bg-gradient-to-br from-amber-950 to-amber-600">
            <Navbar />
            <main className="p-4">{children}</main>
            <Monitoring
              apiKey="fIbgVe71jICFv6C2_0GdDX8saszFAUMU"
              url="https://monitoring.react-scan.com/api/v1/ingest"
              path={"/"}
            />
          </div>
        </CalculatorProvider>
      </AppProvider>
    </PostHogProvider>
  );
}

export default Layout;
