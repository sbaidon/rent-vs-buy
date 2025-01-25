import React, { createContext, useContext, useState } from "react";
import { BuyingCostsCalculator } from "../utils/buy-costs-calculator";
import { RentingCostsCalculator } from "../utils/rent-costs-calculator";
import { CalculatorResults } from "../utils/calculator";

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
  extraUtilities: number;

  // Renting costs
  securityDeposit: number;
  brokerFee: number;
  rentersInsuranceRate: number;
}

export type Results = {
  buying: CalculatorResults;
  renting: CalculatorResults;
};

interface CalculatorContextType {
  values: CalculatorValues;
  updateValue: (key: keyof CalculatorValues, value: number | boolean) => void;
  calculateResults: () => Results;
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(
  undefined
);

export const CalculatorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [values, setValues] = useState<CalculatorValues>({
    // Basic inputs
    pmi: 0,
    homePrice: 500000,
    monthlyRent: 2000,
    mortgageRate: 0.0725,
    mortgageTerm: 30,
    downPayment: 0.2,
    yearsToStay: 10,
    commonChargeDeductionRate: 0,
    commonChargePerMonth: 0,

    // Future projections
    homePriceGrowth: 0.03,
    rentGrowth: 0.03,
    investmentReturn: 0.045,
    inflationRate: 0.03,

    // Tax details
    isJointReturn: true,
    propertyTaxRate: 0.0135,
    marginalTaxRate: 0.2,
    otherDeductions: 0,
    taxCutsExpire: true,

    // Closing costs
    buyingCosts: 0.04,
    sellingCosts: 0.06,

    // Maintenance and fees
    maintenanceRate: 0.01,
    homeInsuranceRate: 0.0055,
    extraUtilities: 100,

    // Renting costs
    securityDeposit: 1,
    brokerFee: 0,
    rentersInsuranceRate: 0.01,
  });

  const updateValue = (
    key: keyof CalculatorValues,
    value: number | boolean
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const calculateResults = (): Results => {
    const buyingCalculator = new BuyingCostsCalculator(values);
    const rentingCalculator = new RentingCostsCalculator(values);

    const buying = buyingCalculator.calculate();
    const renting = rentingCalculator.calculate();

    return {
      buying,
      renting,
    };
  };

  return (
    <CalculatorContext.Provider
      value={{ values, updateValue, calculateResults }}
    >
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
