import { createContext, use, useState, useCallback, useEffect, useRef } from "react";
import { CalculatorResults } from "../utils/calculator";
import {
  CalculatorSearchOutput,
  searchParamsToValues,
  encodeState,
} from "../schemas/calculator";
import { initialValues } from "../constants/calculator";
import { getCountryDefaults, type CountryCode } from "../constants/country-rules";
import { useAppContext } from "./app-context";

export interface CalculatorValues {
  commonChargeDeductionRate: number;
  commonChargePerMonth: number;
  homePrice: number;
  monthlyRent: number;
  mortgageRate: number;
  downPayment: number;
  yearsToStay: number;
  mortgageTerm: number;
  pmi: number;

  // Future projections
  homePriceGrowth: number;
  rentGrowth: number;
  investmentReturn: number;
  inflationRate: number;

  // Tax details
  isJointReturn: boolean;
  propertyTaxRate: number;
  marginalTaxRate: number;
  otherDeductions: number;
  taxCutsExpire: boolean;

  // Closing costs
  buyingCosts: number;
  sellingCosts: number;

  // Maintenance and fees
  maintenanceRate: number;
  homeInsuranceRate: number;
  extraPayments: number;

  // Renting costs
  securityDeposit: number;
  brokerFee: number;
  monthlyRentersInsurance: number;
}

export type Results = {
  buying: CalculatorResults;
  renting: CalculatorResults;
};

interface CalculatorContextType {
  values: CalculatorValues;
  reset: () => void;
  updateValue: (key: keyof CalculatorValues, value: number | boolean) => void;
}

// Export context for direct use() access in React 19
export const CalculatorContext = createContext<CalculatorContextType | undefined>(
  undefined
);

interface CalculatorProviderProps {
  children: React.ReactNode;
  searchParams: CalculatorSearchOutput;
}

/**
 * Calculator context provider with two-tier state model:
 * 
 * 1. Local React state (instant) - for responsive UI during slider interactions
 * 2. URL state (debounced via replaceState) - for shareability, persistence
 * 
 * Uses window.history.replaceState directly to update URL without triggering
 * React/Router re-renders. The URL is read on initial load and on popstate
 * (back/forward navigation).
 * 
 * Reacts to country changes from AppContext by resetting all calculator values
 * to the selected country's defaults.
 */
export function CalculatorProvider({
  children,
  searchParams,
}: CalculatorProviderProps) {
  const { country } = useAppContext();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valuesRef = useRef<CalculatorValues>(null!);
  const prevCountryRef = useRef<CountryCode>(country);

  // Initialize local state from URL params (URL is source of truth on load)
  const [values, setValues] = useState<CalculatorValues>(() => 
    searchParamsToValues(searchParams)
  );
  
  // Keep ref in sync with state
  valuesRef.current = values;

  // Reset calculator values when country changes
  useEffect(() => {
    if (prevCountryRef.current !== country) {
      prevCountryRef.current = country;
      const countryDefaults = getCountryDefaults(country);
      const newValues: CalculatorValues = {
        ...initialValues,
        ...countryDefaults,
      };
      setValues(newValues);
      // Clear URL state so it doesn't persist old country values
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState(null, "", url.toString());
    }
  }, [country]);

  // Listen for back/forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q") || "";
      setValues(searchParamsToValues({ q }));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Update local state immediately, debounce URL updates via replaceState
  const updateValue = useCallback(
    (key: keyof CalculatorValues, value: number | boolean) => {
      // Update local state immediately for responsive UI
      setValues((prev) => ({ ...prev, [key]: value }));

      // Debounce URL update - use replaceState to avoid triggering router
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        const currentValues = valuesRef.current;
        const encoded = encodeState(currentValues);
        const url = new URL(window.location.href);
        url.searchParams.set("q", encoded);
        window.history.replaceState(null, "", url.toString());
      }, 300);
    },
    []
  );

  // Reset to defaults (uses current country defaults)
  const reset = useCallback(() => {
    const countryDefaults = getCountryDefaults(country);
    const newValues: CalculatorValues = {
      ...initialValues,
      ...countryDefaults,
    };
    setValues(newValues);
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState(null, "", url.toString());
  }, [country]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <CalculatorContext.Provider value={{ values, updateValue, reset }}>
      {children}
    </CalculatorContext.Provider>
  );
}

/**
 * Hook to access calculator context using React 19's use() API
 * Can be called conditionally unlike useContext
 */
export function useCalculator() {
  const context = use(CalculatorContext);
  if (context === undefined) {
    throw new Error("useCalculator must be used within a CalculatorProvider");
  }
  return context;
}
