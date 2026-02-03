/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { Component, type ReactNode, useEffect, useRef, useState } from "react";
import { PostHogProvider } from "posthog-js/react";
import { Monitoring } from "react-scan/monitoring";
import posthog from "posthog-js";
import { useTranslation } from "react-i18next";
import {
  AppProvider,
  Country,
  Currency,
  useAppContext,
} from "../context/app-context";
import "../i18n";
import appCss from "../index.css?url";

// ============================================================================
// Error Boundary
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-amber-950 to-amber-600 text-white flex flex-col items-center justify-center p-4">
          <div className="bg-acadia-900 rounded-lg p-8 max-w-md text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-acadia-100 mb-6">
              An error occurred while loading the calculator.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-acadia-700 hover:bg-acadia-600 rounded transition-colors"
            >
              Reload Page
            </button>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 p-4 bg-acadia-950 rounded text-red-400 text-xs text-left overflow-auto">
                {this.state.error.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Navbar
// ============================================================================

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
      className="flex justify-end p-6 lg:relative top-0 z-50"
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
        className={`z-50 flex-col gap-4 absolute right-6 top-[72px] p-4 lg:p-0 w-48 rounded-lg shadow-lg
        lg:w-auto lg:static lg:flex-row lg:bg-transparent lg:shadow-none
        lg:flex ${isMenuOpen ? "flex bg-amber-950" : "hidden"}
      `}
      >
        <div className="flex flex-col lg:flex-row lg:gap-4">
          <select
            id="currency-select"
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="mb-4 lg:mb-0 px-3 py-1 rounded text-white cursor-pointer appearance-none"
            aria-label={t("currency")}
            value={currency}
          >
            <option value="USD">{t("currency_usd")} ($)</option>
          </select>

          <select
            id="language-select"
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="mb-4 lg:mb-0 px-3 py-1 rounded text-white cursor-pointer appearance-none"
            value={i18n.language}
            aria-label={t("language")}
          >
            <option value="en">{t("language_english")}</option>
            <option value="es">{t("language_spanish")}</option>
          </select>

          <div className="relative">
            <select
              id="country-select"
              className="mb-4 lg:mb-0 px-3 py-1 rounded text-white cursor-pointer appearance-none"
              aria-label={t("country")}
              onChange={(e) => setSelectedCountry(e.target.value as Country)}
              value={country}
            >
              <option value="US">🇺🇸 {t("country_united_states")}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PostHog Options
// ============================================================================

const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  capture_pageview: true,
};

// ============================================================================
// Root Route
// ============================================================================

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no",
      },
      { name: "HandheldFriendly", content: "true" },
      { name: "MobileOptimized", content: "width" },
      { title: "Rent vs Buy Calculator - Make an informed decision" },
      {
        name: "description",
        content:
          "Free calculator to help you decide whether to rent or buy a home. Compare costs of renting vs buying with customizable parameters for your specific situation.",
      },
      // Keywords and SEO
      {
        name: "keywords",
        content:
          "rent vs buy, rent or buy calculator, home buying calculator, real estate calculator, property calculator",
      },
      { name: "author", content: "sbaidon" },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#78350f" },
      // Open Graph / Facebook
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://rentvsbuy.io/" },
      {
        property: "og:title",
        content: "Rent vs Buy Calculator - Make an informed decision",
      },
      {
        property: "og:description",
        content:
          "Free calculator to help you decide whether to rent or buy a home. Compare costs of renting vs buying with customizable parameters for your specific situation.",
      },
      { property: "og:image", content: "https://rentvsbuy.io/social-share.webp" },
      { property: "og:image:width", content: "1024" },
      { property: "og:image:height", content: "1024" },
      // Twitter
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:url", content: "https://rentvsbuy.io/" },
      {
        name: "twitter:title",
        content: "Rent vs Buy Calculator - Make an informed decision",
      },
      {
        name: "twitter:description",
        content:
          "Free calculator to help you decide whether to rent or buy a home. Compare costs of renting vs buying with customizable parameters for your specific situation.",
      },
      { name: "twitter:image", content: "https://rentvsbuy.io/social-share.webp" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Texturina:ital,opsz,wght@0,12..72,100..900;1,12..72,100..900&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "canonical", href: "https://rentvsbuy.io/" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Rent vs Buy Calculator",
          description:
            "Free calculator to help you decide whether to rent or buy a home. Compare costs of renting vs buying with customizable parameters for your specific situation.",
          url: "https://rentvsbuy.io",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Any",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          featureList: [
            "Compare renting vs buying costs",
            "Customizable mortgage parameters",
            "Tax deduction calculations",
            "Investment return projections",
            "Multiple currency support",
            "Multilingual support",
          ],
        }),
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <ErrorBoundary>
        <AppProvider>
          <div className="min-h-screen bg-gradient-to-br from-amber-950 to-amber-600">
            <Navbar />
            <main className="pb-6">
              <Outlet />
            </main>
            {/* Monitoring disabled for now to debug SSR issues */}
          </div>
        </AppProvider>
      </ErrorBoundary>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  const [posthogReady, setPosthogReady] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      import.meta.env.VITE_PUBLIC_POSTHOG_KEY
    ) {
      posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, posthogOptions);
      setPosthogReady(true);
    }
  }, []);

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen antialiased">
        {/* Only use PostHogProvider on client after init */}
        {posthogReady ? (
          <PostHogProvider client={posthog}>{children}</PostHogProvider>
        ) : (
          children
        )}
        <Scripts />
      </body>
    </html>
  );
}
