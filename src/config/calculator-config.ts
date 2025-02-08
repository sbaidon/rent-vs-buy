import type { Country, Currency } from "../context/app-context";
import { CalculatorValues } from "../context/calculator-context";

export type CountryConfig = {
  name: string;
  currency: Currency;
  locale: string;
  currencySymbol: string;
};

export type InputConfig = {
  min: number;
  max: number;
  step: number;
};

export const CONFIG_PER_COUNTRY: Record<Country, CountryConfig> = {
  US: {
    name: "United States",
    currency: "USD",
    locale: "en-US",
    currencySymbol: "$",
  },
  MX: {
    name: "Mexico",
    currency: "MXN",
    locale: "es-MX",
    currencySymbol: "$",
  },
  CA: {
    name: "Germany",
    currency: "EUR",
    locale: "de-DE",
    currencySymbol: "€",
  },
};

export const INPUT_CONFIG_PER_COUNTRY: Record<
  Country,
  Record<keyof CalculatorValues, InputConfig>
> = {
  US: {
    homePrice: { min: 100000, max: 2000000, step: 10000 },
    monthlyRent: { min: 500, max: 10000, step: 100 },
    mortgageRate: { min: 0, max: 0.15, step: 0.001 },
    downPayment: { min: 0, max: 1, step: 0.01 },
    yearsToStay: { min: 1, max: 40, step: 1 },
    mortgageTerm: { min: 1, max: 30, step: 1 },
    pmi: { min: 0, max: 0.1, step: 0.01 },
    homePriceGrowth: { min: -0.05, max: 0.15, step: 0.001 },
    rentGrowth: { min: -0.05, max: 0.15, step: 0.01 },
    investmentReturn: { min: -0.2, max: 0.2, step: 0.01 },
    inflationRate: { min: -0.05, max: 0.1, step: 0.001 },
    propertyTaxRate: { min: 0, max: 0.04, step: 0.001 },
    marginalTaxRate: { min: 0, max: 0.5, step: 0.01 },
    otherDeductions: { min: 0, max: 50000, step: 1000 },
    buyingCosts: { min: 0, max: 0.06, step: 0.001 },
    sellingCosts: { min: 0, max: 0.1, step: 0.001 },
    maintenanceRate: { min: 0, max: 0.05, step: 0.001 },
    homeInsuranceRate: { min: 0, max: 0.015, step: 0.001 },
    extraPayments: { min: 0, max: 2000, step: 50 },
    securityDeposit: { min: 0, max: 3, step: 1 },
    brokerFee: { min: 0, max: 0.15, step: 0.01 },
    monthlyRentersInsurance: { min: 0, max: 100, step: 5 },
    commonChargeDeductionRate: { min: 0, max: 0.1, step: 0.01 },
    commonChargePerMonth: { min: 0, max: 1000, step: 10 },
    isJointReturn: { min: 0, max: 1, step: 1 },
    taxCutsExpire: { min: 0, max: 1, step: 1 },
  },
  MX: {
    homePrice: { min: 500000, max: 20000000, step: 100_000 },
    monthlyRent: { min: 3000, max: 50000, step: 500 },
    mortgageRate: { min: 0, max: 0.2, step: 0.001 },
    downPayment: { min: 0.1, max: 1, step: 0.01 },
    yearsToStay: { min: 1, max: 40, step: 1 },
    mortgageTerm: { min: 1, max: 20, step: 1 },
    pmi: { min: 0, max: 0.1, step: 0.01 },
    homePriceGrowth: { min: -0.05, max: 0.2, step: 0.001 },
    rentGrowth: { min: -0.05, max: 0.2, step: 0.01 },
    investmentReturn: { min: -0.2, max: 0.25, step: 0.01 },
    inflationRate: { min: 0, max: 0.15, step: 0.001 },
    propertyTaxRate: { min: 0, max: 0.03, step: 0.001 },
    marginalTaxRate: { min: 0, max: 0.35, step: 0.01 },
    otherDeductions: { min: 0, max: 500000, step: 5000 },
    buyingCosts: { min: 0, max: 0.08, step: 0.001 },
    sellingCosts: { min: 0, max: 0.1, step: 0.001 },
    maintenanceRate: { min: 0, max: 0.03, step: 0.001 },
    homeInsuranceRate: { min: 0, max: 0.02, step: 0.001 },
    extraPayments: { min: 0, max: 10000, step: 250 },
    securityDeposit: { min: 1, max: 2, step: 1 },
    brokerFee: { min: 0, max: 0.1, step: 0.01 },
    monthlyRentersInsurance: { min: 0, max: 500, step: 25 },
    commonChargeDeductionRate: { min: 0, max: 0.1, step: 0.01 },
    commonChargePerMonth: { min: 0, max: 1000, step: 10 },
    isJointReturn: { min: 0, max: 1, step: 1 },
    taxCutsExpire: { min: 0, max: 1, step: 1 },
  },
  CA: {
    homePrice: { min: 200000, max: 3000000, step: 10000 },
    monthlyRent: { min: 800, max: 15000, step: 100 },
    mortgageRate: { min: 0, max: 0.12, step: 0.001 },
    downPayment: { min: 0.05, max: 1, step: 0.01 },
    yearsToStay: { min: 1, max: 40, step: 1 },
    mortgageTerm: { min: 1, max: 30, step: 1 },
    pmi: { min: 0, max: 0.04, step: 0.001 },
    homePriceGrowth: { min: -0.05, max: 0.15, step: 0.001 },
    rentGrowth: { min: -0.05, max: 0.15, step: 0.01 },
    investmentReturn: { min: -0.2, max: 0.2, step: 0.01 },
    inflationRate: { min: -0.05, max: 0.1, step: 0.001 },
    propertyTaxRate: { min: 0, max: 0.025, step: 0.001 },
    marginalTaxRate: { min: 0, max: 0.5, step: 0.01 },
    otherDeductions: { min: 0, max: 75000, step: 1000 },
    buyingCosts: { min: 0, max: 0.05, step: 0.001 },
    sellingCosts: { min: 0, max: 0.1, step: 0.001 },
    maintenanceRate: { min: 0, max: 0.02, step: 0.001 },
    homeInsuranceRate: { min: 0, max: 0.015, step: 0.001 },
    extraPayments: { min: 0, max: 2500, step: 50 },
    securityDeposit: { min: 0, max: 2, step: 1 },
    brokerFee: { min: 0, max: 0.1, step: 0.01 },
    monthlyRentersInsurance: { min: 0, max: 150, step: 5 },
    commonChargeDeductionRate: { min: 0, max: 0.1, step: 0.01 },
    commonChargePerMonth: { min: 0, max: 1000, step: 10 },
    isJointReturn: { min: 0, max: 1, step: 1 },
    taxCutsExpire: { min: 0, max: 1, step: 1 },
  },
};
