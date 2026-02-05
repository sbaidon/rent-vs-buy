import { createContext, use, useState, useCallback } from "react";
import type { CountryCode } from "../constants/country-rules";

interface AppContextType {
  country: CountryCode;
  setSelectedCountry: (country: CountryCode) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

// Re-export CountryCode for backward compatibility
export type Country = CountryCode;

export type Currency = "USD" | "EUR" | "MXN" | "CAD" | "GBP";

// Map countries to their default currencies
export const COUNTRY_CURRENCIES: Record<CountryCode, Currency> = {
  US: "USD",
  CA: "CAD",
  MX: "MXN",
  DE: "EUR",
  FR: "EUR",
  GB: "GBP",
  IT: "EUR",
  ES: "EUR",
};

// All available currencies with display labels
export const COUNTRY_CURRENCY_OPTIONS: { code: Currency; label: string }[] = [
  { code: "USD", label: "USD ($)" },
  { code: "CAD", label: "CAD ($)" },
  { code: "MXN", label: "MXN ($)" },
  { code: "EUR", label: "EUR (\u20AC)" },
  { code: "GBP", label: "GBP (\u00A3)" },
];

// Export context for direct use() access in React 19
export const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountry] = useState<CountryCode>("US");
  const [currency, setCurrency] = useState<Currency>("USD");

  // When country changes, optionally update currency to match
  const setSelectedCountry = useCallback((newCountry: CountryCode) => {
    setCountry(newCountry);
    // Auto-select the appropriate currency for the country
    const countryCurrency = COUNTRY_CURRENCIES[newCountry];
    if (countryCurrency) {
      setCurrency(countryCurrency);
    }
  }, []);

  return (
    <AppContext.Provider
      value={{ country, setSelectedCountry, currency, setCurrency }}
    >
      {children}
    </AppContext.Provider>
  );
};

/**
 * Hook to access app context using React 19's use() API
 * Can be called conditionally unlike useContext
 */
export function useAppContext() {
  const context = use(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
