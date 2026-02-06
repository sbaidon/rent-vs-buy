/// <reference types="vite/client" />
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  ScriptOnce,
  createRootRoute,
} from "@tanstack/react-router";
import { Component, type ReactNode, useEffect, useRef, useState } from "react";
import { PostHogProvider } from "posthog-js/react";
import posthog from "posthog-js";
import { useTranslation } from "react-i18next";
import { Map, Calculator, Sun, Moon, Monitor } from "lucide-react";
import { Toaster } from "sonner";
import {
  AppProvider,
  Country,
  Currency,
  COUNTRY_CURRENCY_OPTIONS,
  useAppContext,
} from "../context/app-context";
import { SUPPORTED_COUNTRIES } from "../constants/country-rules";
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
    console.error("ErrorBoundary caught an error:", error);
    console.error("Component stack:", errorInfo.componentStack);
    console.error("Error stack:", error.stack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Something went wrong
            </h1>
            <p className="text-[var(--text-muted)] mt-2">
              Please refresh the page and try again.
            </p>
            {this.state.error && (
              <details className="mt-4 text-left max-w-lg mx-auto">
                <summary className="cursor-pointer text-copper-500">
                  Error details
                </summary>
                <pre className="mt-2 p-4 bg-[var(--bg-surface)] rounded text-xs overflow-auto text-[var(--text-secondary)]">
                  {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// PostHog Configuration
// ============================================================================

const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
  person_profiles: "always" as const,
  capture_pageview: true,
  capture_pageleave: true,
};

// ============================================================================
// Theme Toggle
// ============================================================================

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const getButtonClass = (buttonTheme: "light" | "dark" | "system") => {
    const isActive = theme === buttonTheme;
    return `p-1.5 rounded transition-colors ${
      isActive
        ? "bg-copper-500 text-white"
        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
    }`;
  };

  return (
    <div className="flex items-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-0.5" data-testid="theme-toggle">
      <button
        onClick={() => setTheme("light")}
        className={getButtonClass("light")}
        aria-label="Light mode"
        data-testid="theme-light"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={getButtonClass("dark")}
        aria-label="Dark mode"
        data-testid="theme-dark"
      >
        <Moon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={getButtonClass("system")}
        aria-label="System theme"
        data-testid="theme-system"
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
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Focus first select when dropdown opens; close on Escape
  useEffect(() => {
    if (!isMenuOpen) return;
    const firstSelect = dropdownRef.current?.querySelector("select");
    firstSelect?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  return (
    <header
      className="sticky top-0 z-50 bg-[var(--bg-surface)]/90 backdrop-blur-xl border-b border-[var(--border-default)]"
      ref={menuRef}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Nav Links */}
          <div className="flex items-center gap-8">
            <Link to="/" viewTransition className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded bg-gradient-to-br from-copper-500 to-copper-700 flex items-center justify-center border border-copper-400/30 shadow-lg shadow-copper-500/20 group-hover:shadow-copper-500/40 transition-shadow">
                <span className="text-white font-mono font-semibold text-sm tracking-tight">RB</span>
              </div>
              <span className="font-display text-[var(--text-primary)] text-lg hidden sm:block italic font-light tracking-tight">RentVsBuy</span>
            </Link>
            <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Main navigation">
              <Link
                to="/"
                viewTransition
                aria-label={t("nav.calculator")}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-all text-xs sm:text-sm font-medium tracking-wide uppercase"
                activeProps={{ className: "!bg-copper-500/10 !text-copper-500" }}
                activeOptions={{ exact: true }}
              >
                <Calculator className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t("nav.calculator")}</span>
              </Link>
              <Link
                to="/explore"
                viewTransition
                aria-label={t("nav.explore")}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-all text-xs sm:text-sm font-medium tracking-wide uppercase"
                activeProps={{ className: "!bg-copper-500/10 !text-copper-500" }}
              >
                <Map className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t("nav.explore")}</span>
              </Link>
            </nav>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {/* Settings Menu Button */}
            <div className="relative">
              <button
                id="settings-button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={t("settings.title") || "Settings"}
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <span className="text-sm font-medium">{country}</span>
                <span className="text-[var(--text-muted)]" aria-hidden="true">|</span>
                <span className="text-sm font-medium">{currency}</span>
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div
                  ref={dropdownRef}
                  role="dialog"
                  aria-labelledby="settings-button"
                  className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xl z-50 p-3"
                >
                  <div className="space-y-3">
                    {/* Country Select */}
                    <div>
                      <label htmlFor="country-select" className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">
                        {t("settings.country")}
                      </label>
                      <select
                        id="country-select"
                        value={country}
                        onChange={(e) => setSelectedCountry(e.target.value as Country)}
                        className="mt-1 w-full px-2.5 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm"
                      >
                        {SUPPORTED_COUNTRIES.map(({ code, flag }) => (
                          <option key={code} value={code}>
                            {flag} {t(`countries.${code}`)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Currency Select */}
                    <div>
                      <label htmlFor="currency-select" className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">
                        {t("settings.currency")}
                      </label>
                      <select
                        id="currency-select"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as Currency)}
                        className="mt-1 w-full px-2.5 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm"
                      >
                        {COUNTRY_CURRENCY_OPTIONS.map(({ code, label }) => (
                          <option key={code} value={code}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Language Select */}
                    <div>
                      <label htmlFor="language-select" className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">
                        {t("settings.language")}
                      </label>
                      <select
                        id="language-select"
                        value={i18n.language}
                        onChange={(e) => i18n.changeLanguage(e.target.value)}
                        className="mt-1 w-full px-2.5 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm"
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                        <option value="it">Italiano</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

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
          "width=device-width, initial-scale=1.0, shrink-to-fit=no",
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
      // Preconnect to map tile servers for faster map loading
      { rel: "preconnect", href: "https://nominatim.openstreetmap.org" },
      { rel: "preconnect", href: "https://basemaps.cartocdn.com" },
      {
        rel: "preconnect",
        href: "https://a.basemaps.cartocdn.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "preconnect",
        href: "https://b.basemaps.cartocdn.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "preconnect",
        href: "https://c.basemaps.cartocdn.com",
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
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--bg-elevated)] focus:text-[var(--text-primary)] focus:rounded focus:border focus:border-[var(--border-default)] focus:shadow-lg"
              >
                Skip to main content
              </a>
              <Navbar />
              <main id="main-content">
                <Outlet />
              </main>
            </div>
            <Toaster
              position="bottom-right"
              toastOptions={{
                className: "font-mono text-sm",
                style: {
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-default)",
                },
              }}
            />
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
    // Default to "dark" class to match CSS :root defaults and prevent flash
    // ScriptOnce will override this based on localStorage before paint
    <html lang="en" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        <HeadContent />
        <ScriptOnce>
          {`
            (function() {
              var classList = document.documentElement.classList;
              var style = document.documentElement.style;
              var theme = localStorage.getItem("theme");
              if (theme === "dark") {
                // Already dark, no change needed
              } else if (theme === "light") {
                classList.remove("dark");
                classList.add("light");
                style.colorScheme = "light";
              } else {
                var isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                if (!isDark) {
                  classList.remove("dark");
                  classList.add("light");
                  style.colorScheme = "light";
                }
              }
            })();
          `}
        </ScriptOnce>
      </head>
      <body className="min-h-screen antialiased">
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
