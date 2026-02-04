/// <reference types="vite/client" />
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { Component, type ReactNode, useEffect, useRef, useState } from "react";
import { PostHogProvider } from "posthog-js/react";
import { Monitoring } from "react-scan/monitoring";
import posthog from "posthog-js";
import { useTranslation } from "react-i18next";
import { Map, Calculator } from "lucide-react";
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
    <header
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100"
      ref={menuRef}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Nav Links */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">RB</span>
              </div>
              <span className="font-semibold text-slate-900 text-lg hidden sm:block">RentVsBuy</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all text-sm font-medium"
                activeProps={{ className: "!bg-sky-50 !text-sky-700" }}
              >
                <Calculator className="w-4 h-4" />
                Calculator
              </Link>
              <Link
                to="/explore"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all text-sm font-medium"
                activeProps={{ className: "!bg-sky-50 !text-sky-700" }}
              >
                <Map className="w-4 h-4" />
                Explore
              </Link>
            </nav>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            {/* Desktop selects */}
            <div className="hidden lg:flex items-center gap-2">
              <select
                id="currency-select"
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="px-3 py-1.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer appearance-none border-0 focus:ring-2 focus:ring-sky-500 transition-colors"
                aria-label={t("currency")}
                value={currency}
              >
                <option value="USD">$ USD</option>
              </select>

              <select
                id="language-select"
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer appearance-none border-0 focus:ring-2 focus:ring-sky-500 transition-colors"
                value={i18n.language}
                aria-label={t("language")}
              >
                <option value="en">EN</option>
                <option value="es">ES</option>
              </select>

              <select
                id="country-select"
                className="px-3 py-1.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer appearance-none border-0 focus:ring-2 focus:ring-sky-500 transition-colors"
                aria-label={t("country")}
                onChange={(e) => setSelectedCountry(e.target.value as Country)}
                value={country}
              >
                <option value="US">🇺🇸 US</option>
              </select>
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={t("toggle_menu")}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white">
          <div className="px-4 py-4 space-y-3">
            {/* Mobile nav links */}
            <div className="space-y-1">
              <Link
                to="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <Calculator className="w-5 h-5" />
                <span className="font-medium">Calculator</span>
              </Link>
              <Link
                to="/explore"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <Map className="w-5 h-5" />
                <span className="font-medium">Explore</span>
              </Link>
            </div>

            {/* Mobile selects */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
              <select
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="px-3 py-2 rounded-lg text-sm text-slate-600 bg-slate-100 cursor-pointer appearance-none border-0"
                value={currency}
              >
                <option value="USD">$ USD</option>
              </select>
              <select
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm text-slate-600 bg-slate-100 cursor-pointer appearance-none border-0"
                value={i18n.language}
              >
                <option value="en">EN</option>
                <option value="es">ES</option>
              </select>
              <select
                onChange={(e) => setSelectedCountry(e.target.value as Country)}
                className="px-3 py-2 rounded-lg text-sm text-slate-600 bg-slate-100 cursor-pointer appearance-none border-0"
                value={country}
              >
                <option value="US">🇺🇸 US</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </header>
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
      { name: "theme-color", content: "#0ea5e9" },
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
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap",
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
          <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main>
              <Outlet />
            </main>
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
