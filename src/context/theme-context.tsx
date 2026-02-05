import { createContext, use, useState, useCallback, useEffect, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyTheme(resolved: ResolvedTheme, animate = false) {
  const update = () => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolved);
    document.documentElement.style.colorScheme = resolved;
  };

  // Use View Transitions API for smooth theme animation if available and requested
  if (animate && "startViewTransition" in document) {
    (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(update);
  } else {
    update();
  }
}

/**
 * Get initial theme from localStorage synchronously.
 * This runs during component initialization to avoid hydration mismatch.
 * The inline script in __root.tsx already applied the correct classes to the DOM.
 */
function getInitialTheme(): { theme: Theme; resolved: ResolvedTheme } {
  if (typeof window === "undefined") {
    // SSR: return defaults
    return { theme: "system", resolved: "dark" };
  }
  
  // Client: read from localStorage to match what the inline script did
  const stored = localStorage.getItem(STORAGE_KEY);
  const theme: Theme = 
    stored === "light" || stored === "dark" || stored === "system" 
      ? stored 
      : "system";
  const resolved = resolveTheme(theme);
  
  return { theme, resolved };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize state to match what the inline script already applied to DOM
  // This avoids hydration mismatch and prevents flash
  const [{ theme, resolved: resolvedTheme }, setThemeState] = useState(getInitialTheme);

  const setTheme = useCallback((newTheme: Theme) => {
    const resolved = resolveTheme(newTheme);
    setThemeState({ theme: newTheme, resolved });
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(resolved, true); // Animate theme transitions
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") {
        const resolved = getSystemTheme();
        setThemeState(prev => ({ ...prev, resolved }));
        applyTheme(resolved);
      }
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = use(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
