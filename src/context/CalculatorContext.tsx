import React, { createContext, useContext, useState } from 'react';

interface CalculatorValues {
  // Basic inputs
  homePrice: number;
  monthlyRent: number;
  mortgageRate: number;
  downPayment: number;
  yearsToStay: number;

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

interface CalculatorResults {
  buying: {
    netWorth: number;
    totalCost: number;
    opportunityCost: number;
    homeValue: number;
  };
  renting: {
    netWorth: number;
    totalCost: number;
    opportunityCost: number;
  };
}

interface CalculatorContextType {
  values: CalculatorValues;
  updateValue: (key: keyof CalculatorValues, value: number | boolean) => void;
  calculateResults: () => CalculatorResults;
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

export const CalculatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [values, setValues] = useState<CalculatorValues>({
    // Basic inputs
    homePrice: 500000,
    monthlyRent: 2000,
    mortgageRate: 0.0725,
    downPayment: 0.20,
    yearsToStay: 10,

    // Future projections
    homePriceGrowth: 0.03,
    rentGrowth: 0.03,
    investmentReturn: 0.045,
    inflationRate: 0.03,

    // Tax details
    isJointReturn: true,
    propertyTaxRate: 0.0135,
    marginalTaxRate: 0.20,
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
    rentersInsuranceRate: 0.01
  });

  const updateValue = (key: keyof CalculatorValues, value: number | boolean) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const calculateResults = (): CalculatorResults => {
    // Enhanced calculations including all factors
    const monthlyMortgage = values.homePrice * (1 - values.downPayment) * 
      (values.mortgageRate / 12) * Math.pow(1 + values.mortgageRate / 12, 360) / 
      (Math.pow(1 + values.mortgageRate / 12, 360) - 1);

    const yearlyPropertyTax = values.homePrice * values.propertyTaxRate;
    const yearlyHomeInsurance = values.homePrice * values.homeInsuranceRate;
    const yearlyMaintenance = values.homePrice * values.maintenanceRate;
    const monthlyUtilities = values.extraUtilities;

    const buyingTotalCost = (monthlyMortgage * 12 + yearlyPropertyTax + 
      yearlyHomeInsurance + yearlyMaintenance + monthlyUtilities * 12) * 30;
    
    const rentingTotalCost = values.monthlyRent * 12 * 30;
    const homeValue = values.homePrice * Math.pow(1 + values.homePriceGrowth, 30);
    
    const buyingOpportunityCost = values.homePrice * values.downPayment * 
      Math.pow(1 + values.investmentReturn, 30);
    
    const rentingOpportunityCost = values.monthlyRent * 12 * 
      (Math.pow(1 + values.investmentReturn, 30) - 1) / values.investmentReturn;

    return {
      buying: {
        netWorth: homeValue - buyingTotalCost - buyingOpportunityCost,
        totalCost: buyingTotalCost,
        opportunityCost: buyingOpportunityCost,
        homeValue
      },
      renting: {
        netWorth: -rentingTotalCost - rentingOpportunityCost,
        totalCost: rentingTotalCost,
        opportunityCost: rentingOpportunityCost
      }
    };
  };

  return (
    <CalculatorContext.Provider value={{ values, updateValue, calculateResults }}>
      {children}
    </CalculatorContext.Provider>
  );
};

export const useCalculator = () => {
  const context = useContext(CalculatorContext);
  if (context === undefined) {
    throw new Error('useCalculator must be used within a CalculatorProvider');
  }
  return context;
};