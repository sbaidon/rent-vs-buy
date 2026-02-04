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
import { Map, Calculator, Sun, Moon, Monitor } from "lucide-react";
import {
  AppProvider,
  Country,
  Currency,
  useAppContext,
} from "../context/app-context";
import { ThemeProvider, useTheme } from "../context/theme-context";
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
        <div className="min-h-screen bg-ink-950 text-ink-100 flex flex-col items-center justify-center p-4">
          <div className="panel p-8 max-w-md text-center">
            <h2 className="text-2xl font-display mb-4 text-ink-50">Something went wrong</h2>
            <p className="text-ink-300 mb-6">
              An error occurred while loading the calculator.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Reload Page
            </button>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 p-4 bg-ink-900 rounded text-red-400 text-xs text-left overflow-auto font-mono border border-ink-700">
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
// Theme Toggle
// ============================================================================

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-0.5">
      <button
        onClick={() => setTheme("light")}
        className={`p-1.5 rounded transition-colors ${
          theme === "light"
            ? "bg-copper-500 text-white"
            : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
        }`}
        aria-label="Light mode"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`p-1.5 rounded transition-colors ${
          theme === "dark"
            ? "bg-copper-500 text-white"
            : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
        }`}
        aria-label="Dark mode"
      >
        <Moon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`p-1.5 rounded transition-colors ${
          theme === "system"
            ? "bg-copper-500 text-white"
            : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
        }`}
        aria-label="System theme"
      >
        <Monitor className="w-4 h-4" />
      </button>
    </div>
  );
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
      className="sticky top-0 z-50 bg-[var(--bg-surface)]/90 backdrop-blur-xl border-b border-[var(--border-default)]"
      ref={menuRef}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Nav Links */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded bg-gradient-to-br from-copper-500 to-copper-700 flex items-center justify-center border border-copper-400/30 shadow-lg shadow-copper-500/20 group-hover:shadow-copper-500/40 transition-shadow">
                <span className="text-white font-mono font-semibold text-sm tracking-tight">RB</span>
              </div>
              <span className="font-display text-[var(--text-primary)] text-lg hidden sm:block italic font-light tracking-tight">RentVsBuy</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className="flex items-center gap-2 px-4 py-2 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-all text-sm font-medium tracking-wide uppercase"
                activeProps={{ className: "!bg-copper-500/10 !text-copper-500" }}
              >
                <Calculator className="w-4 h-4" />
                Calculator
              </Link>
              <Link
                to="/explore"
                className="flex items-center gap-2 px-4 py-2 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-all text-sm font-medium tracking-wide uppercase"
                activeProps={{ className: "!bg-copper-500/10 !text-copper-500" }}
              >
                <Map className="w-4 h-4" />
                Explore
              </Link>
            </nav>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Desktop selects */}
            <div className="hidden lg:flex items-center gap-2">
              <select
                id="currency-select"
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="px-3 py-1.5 rounded text-sm text-[var(--text-secondary)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-muted)] cursor-pointer appearance-none border border-[var(--border-default)] focus:ring-2 focus:ring-copper-500/50 focus:border-copper-500 transition-colors font-mono"
                aria-label={t("currency")}
                value={currency}
              >
                <option value="USD">$ USD</option>
              </select>

              <select
                id="language-select"
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="px-3 py-1.5 rounded text-sm text-[var(--text-secondary)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-muted)] cursor-pointer appearance-none border border-[var(--border-default)] focus:ring-2 focus:ring-copper-500/50 focus:border-copper-500 transition-colors font-mono"
                value={i18n.language}
                aria-label={t("language")}
              >
                <option value="en">EN</option>
                <option value="es">ES</option>
              </select>

              <select
                id="country-select"
                className="px-3 py-1.5 rounded text-sm text-[var(--text-secondary)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-muted)] cursor-pointer appearance-none border border-[var(--border-default)] focus:ring-2 focus:ring-copper-500/50 focus:border-copper-500 transition-colors"
                aria-label={t("country")}
                onChange={(e) => setSelectedCountry(e.target.value as Country)}
                value={country}
              >
                <option value="US">US</option>
              </select>
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
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
        <div className="lg:hidden border-t border-[var(--border-default)] bg-[var(--bg-surface)]">
          <div className="px-4 py-4 space-y-3">
            {/* Mobile nav links */}
            <div className="space-y-1">
              <Link
                to="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <Calculator className="w-5 h-5" />
                <span className="font-medium uppercase tracking-wide text-sm">Calculator</span>
              </Link>
              <Link
                to="/explore"
                className="flex items-center gap-3 px-3 py-2.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <Map className="w-5 h-5" />
                <span className="font-medium uppercase tracking-wide text-sm">Explore</span>
              </Link>
            </div>

            {/* Mobile theme toggle */}
            <div className="pt-3 border-t border-[var(--border-default)] flex justify-center">
              <ThemeToggle />
            </div>

            {/* Mobile selects */}
            <div className="pt-3 border-t border-[var(--border-default)] grid grid-cols-3 gap-2">
              <select
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="px-3 py-2 rounded text-sm text-[var(--text-secondary)] bg-[var(--bg-elevated)] cursor-pointer appearance-none border border-[var(--border-default)] font-mono"
                value={currency}
              >
                <option value="USD">$ USD</option>
              </select>
              <select
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="px-3 py-2 rounded text-sm text-[var(--text-secondary)] bg-[var(--bg-elevated)] cursor-pointer appearance-none border border-[var(--border-default)] font-mono"
                value={i18n.language}
              >
                <option value="en">EN</option>
                <option value="es">ES</option>
              </select>
              <select
                onChange={(e) => setSelectedCountry(e.target.value as Country)}
                className="px-3 py-2 rounded text-sm text-[var(--text-secondary)] bg-[var(--bg-elevated)] cursor-pointer appearance-none border border-[var(--border-default)]"
                value={country}
              >
                <option value="US">US</option>
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
      { name: "theme-color", content: "#0a0f1a" },
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
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,500;1,300;1,400&family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600&display=swap",
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
      <ThemeProvider>
        <ErrorBoundary>
          <AppProvider>
            <div className="min-h-screen">
              <Navbar />
              <main>
                <Outlet />
              </main>
            </div>
          </AppProvider>
        </ErrorBoundary>
      </ThemeProvider>
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
