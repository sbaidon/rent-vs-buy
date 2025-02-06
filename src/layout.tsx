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
import { useEffect } from "react";
import posthog from "posthog-js";

function Navbar() {
  const { setCurrency, setSelectedCountry, country, currency } =
    useAppContext();
  useAppContext();
  const { t, i18n } = useTranslation();

  return (
    <div className="flex justify-end gap-4 p-6">
      <div className="flex flex-col">
        <label htmlFor="currency-select" className="sr-only">
          {t("currency")}
        </label>
        <select
          id="currency-select"
          onChange={(e) => setCurrency(e.target.value as Currency)}
          className="mb-4 px-3 py-1 rounded bg-transparent text-white cursor-pointer"
          defaultValue="USD"
          aria-label={t("currency")}
          value={currency}
        >
          <option value="USD">{t("currency_usd")}</option>
          <option value="EUR">{t("currency_eur")}</option>
          <option value="MXN">{t("currency_mxn")}</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label htmlFor="language-select" className="sr-only">
          {t("language")}
        </label>
        <select
          id="language-select"
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className="mb-4 px-3 py-1 rounded bg-transparent text-white cursor-pointer"
          value={i18n.language}
          aria-label={t("language")}
        >
          <option value="en">{t("language_english")}</option>
          <option value="es">{t("language_spanish")}</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label htmlFor="country-select" className="sr-only">
          {t("country")}
        </label>
        <div className="flex items-center gap-2 relative">
          <select
            id="country-select"
            className="mb-4 px-3 py-1 rounded bg-transparent text-white cursor-pointer"
            defaultValue="US"
            aria-label={t("country")}
            onChange={(e) => setSelectedCountry(e.target.value as Country)}
            value={country}
          >
            <option value="US">{t("country_united_states")}</option>
            <option value="CA">{t("country_canada")}</option>
            <option value="MX">{t("country_mexico")}</option>
          </select>
          <span className="absolute -top-2 -right-2 bg-amber-700/50 text-amber-200 text-xs px-2 py-1 rounded-full">
            {t("more_countries_soon")}
          </span>
        </div>
      </div>
    </div>
  );
}

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  capture_pageview: false,
};

function Layout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, options);
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <Head>
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
          <div className="min-h-screen bg-linear-to-br/oklab from-amber-950 to-amber-600">
            <Navbar />
            <main className="p-4 flex justify-between flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
              {children}
            </main>
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
