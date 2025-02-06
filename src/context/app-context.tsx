import React, { createContext, useContext, useState } from "react";

interface AppContextType {
  country: Country;
  setSelectedCountry: (country: Country) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

export type Country = "US" | "CA" | "MX";

export type Currency = "USD" | "EUR" | "MXN";

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [country, setSelectedCountry] = useState<Country>("US"); // default country
  const [currency, setCurrency] = useState<Currency>("USD");

  return (
    <AppContext.Provider
      value={{ country, setSelectedCountry, currency, setCurrency }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
