import React, { createContext, useContext, useState } from "react";
import { usePageContext } from "vike-react/usePageContext";
import { CalculatorResults } from "../utils/calculator";
import { encodeState, decodeState } from "../utils/state";
import { initialValues } from "../constants/calculator";

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

const CalculatorContext = createContext<CalculatorContextType | undefined>(
  undefined
);

export const CalculatorProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const pageContext = usePageContext();
  const initialState = pageContext.data.initialState;

  // Initialize state from URL or use default values
  const [values, setValues] = useState<CalculatorValues>(() => {
    if (initialState) {
      return { ...initialValues, ...initialState };
    }
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const state = params.get("q");
      if (state) {
        return decodeState(state, initialValues);
      }
    }
    return initialValues;
  });

  // Add debounce utility at the component level
  const debounceTimeout = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      // Clear any existing timeout
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      // Set new timeout for 500ms
      debounceTimeout.current = setTimeout(() => {
        const stateString = encodeState(values);
        const params = new URLSearchParams(window.location.search);
        params.set("q", stateString);

        const newUrl = `${window.location.pathname}?${params.toString()}${
          window.location.hash
        }`;
        window.history.replaceState({}, "", newUrl);
      }, 500);
    }

    // Cleanup timeout on unmount or when values change
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [values]);

  const updateValue = React.useCallback(
    (key: keyof CalculatorValues, value: number | boolean) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const reset = React.useCallback(() => {
    setValues(initialValues);
  }, []);

  return (
    <CalculatorContext.Provider value={{ values, updateValue, reset }}>
      {children}
    </CalculatorContext.Provider>
  );
};

export const useCalculator = () => {
  const context = useContext(CalculatorContext);
  if (context === undefined) {
    throw new Error("useCalculator must be used within a CalculatorProvider");
  }
  return context;
};
