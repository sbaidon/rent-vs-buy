/**
 * Country-specific rules for rent vs buy calculations
 * 
 * Each country has different:
 * - Tax rules (deductions, capital gains, property taxes)
 * - Closing costs (notary fees, transfer taxes, etc.)
 * - Mortgage structures (typical terms, down payment requirements)
 * - Default values for calculations
 */

import type { CalculatorValues } from "../context/calculator-context";

export type CountryCode = "US" | "CA" | "MX" | "DE" | "FR" | "GB" | "IT" | "ES";

export interface CountryTaxRules {
  // Whether mortgage interest is tax deductible
  mortgageInterestDeductible: boolean;
  // Maximum deductible amount (if applicable)
  maxDeductibleInterest?: number;
  // Capital gains tax rate on property sale
  capitalGainsTaxRate: number;
  // Primary residence exemption amount (if any)
  capitalGainsExemption: number;
  // Whether property taxes are deductible
  propertyTaxDeductible: boolean;
  // SALT cap (State and Local Tax - US specific)
  saltCap?: number;
  // Standard deduction amounts
  standardDeduction: {
    single: number;
    joint: number;
  };
}

export interface CountryClosingCosts {
  // Notary fees (percentage of price) - mandatory in many EU countries
  notaryFees: number;
  // Property transfer tax / Stamp duty
  transferTax: number;
  // Whether transfer tax varies by region/state
  transferTaxVariesByRegion: boolean;
  // Registration fees
  registrationFees: number;
  // Typical real estate agent commission on sale
  agentCommission: number;
  // Who pays agent commission: "buyer" | "seller" | "split"
  agentCommissionPaidBy: "buyer" | "seller" | "split";
}

export interface CountryMortgageRules {
  // Typical mortgage term in years
  typicalTerm: number;
  // Available terms
  availableTerms: number[];
  // Minimum down payment (as decimal)
  minDownPayment: number;
  // Typical down payment (as decimal)
  typicalDownPayment: number;
  // Whether PMI/mortgage insurance exists
  hasMortgageInsurance: boolean;
  // PMI threshold (LTV ratio below which PMI not required)
  mortgageInsuranceThreshold: number;
  // Whether fixed or variable rates are more common
  typicalRateType: "fixed" | "variable" | "both";
  // Typical fixed rate period if variable (e.g., 5 years in UK)
  fixedRatePeriod?: number;
}

export interface CountryRentingRules {
  // Typical security deposit (in months of rent)
  typicalSecurityDeposit: number;
  // Maximum legal security deposit (if regulated)
  maxSecurityDeposit?: number;
  // Whether broker fees are common
  brokerFeesCommon: boolean;
  // Typical broker fee (as decimal of annual rent)
  typicalBrokerFee: number;
}

export interface CountryDefaults {
  // Default property tax rate
  propertyTaxRate: number;
  // Default home insurance rate
  homeInsuranceRate: number;
  // Default maintenance rate
  maintenanceRate: number;
  // Default inflation rate
  inflationRate: number;
  // Default home price growth rate
  homePriceGrowth: number;
  // Default investment return rate
  investmentReturn: number;
}

export interface CountryConfig {
  code: CountryCode;
  name: string;
  currency: string;
  taxRules: CountryTaxRules;
  closingCosts: CountryClosingCosts;
  mortgageRules: CountryMortgageRules;
  rentingRules: CountryRentingRules;
  defaults: CountryDefaults;
  // UI labels for country-specific fields
  labels?: {
    propertyTax?: string; // e.g., "Council Tax" in UK, "Grundsteuer" in DE
    transferTax?: string; // e.g., "Stamp Duty" in UK, "Grunderwerbsteuer" in DE
  };
}

/**
 * United States
 * - Mortgage interest deduction (up to $750k loan)
 * - Capital gains exclusion ($250k single, $500k joint)
 * - Property taxes deductible (SALT capped at $10k)
 * - 30-year fixed mortgages common
 */
export const US_CONFIG: CountryConfig = {
  code: "US",
  name: "United States",
  currency: "USD",
  taxRules: {
    mortgageInterestDeductible: true,
    maxDeductibleInterest: 750000, // Loan cap
    capitalGainsTaxRate: 0.15,
    capitalGainsExemption: 500000, // $500k for joint, $250k for single
    propertyTaxDeductible: true,
    saltCap: 10000,
    standardDeduction: {
      single: 14600,
      joint: 29200,
    },
  },
  closingCosts: {
    notaryFees: 0,
    transferTax: 0.01, // Varies by state, ~1% average
    transferTaxVariesByRegion: true,
    registrationFees: 0.002,
    agentCommission: 0.05, // 5-6% total
    agentCommissionPaidBy: "seller",
  },
  mortgageRules: {
    typicalTerm: 30,
    availableTerms: [15, 20, 30],
    minDownPayment: 0.03, // FHA allows 3.5%, conventional 3%
    typicalDownPayment: 0.20,
    hasMortgageInsurance: true,
    mortgageInsuranceThreshold: 0.80,
    typicalRateType: "fixed",
  },
  rentingRules: {
    typicalSecurityDeposit: 1,
    brokerFeesCommon: true, // Common in NYC, Boston
    typicalBrokerFee: 0.0833, // ~1 month rent
  },
  defaults: {
    propertyTaxRate: 0.012,
    homeInsuranceRate: 0.0035,
    maintenanceRate: 0.01,
    inflationRate: 0.025,
    homePriceGrowth: 0.03,
    investmentReturn: 0.07,
  },
};

/**
 * Canada
 * - No mortgage interest deduction for primary residence
 * - Capital gains exempt on primary residence
 * - Land transfer tax varies by province
 * - 25-year amortization common, but rates reset every 5 years
 */
export const CA_CONFIG: CountryConfig = {
  code: "CA",
  name: "Canada",
  currency: "CAD",
  taxRules: {
    mortgageInterestDeductible: false,
    capitalGainsTaxRate: 0.25, // 50% of gains taxed at marginal rate
    capitalGainsExemption: Infinity, // Primary residence exemption
    propertyTaxDeductible: false,
    standardDeduction: {
      single: 15705, // Basic personal amount
      joint: 15705,
    },
  },
  closingCosts: {
    notaryFees: 0.005, // ~$1000-2000 typically
    transferTax: 0.015, // Land transfer tax varies by province
    transferTaxVariesByRegion: true,
    registrationFees: 0.001,
    agentCommission: 0.05,
    agentCommissionPaidBy: "seller",
  },
  mortgageRules: {
    typicalTerm: 25,
    availableTerms: [15, 20, 25, 30],
    minDownPayment: 0.05, // 5% for homes under $500k
    typicalDownPayment: 0.20,
    hasMortgageInsurance: true, // CMHC
    mortgageInsuranceThreshold: 0.80,
    typicalRateType: "variable",
    fixedRatePeriod: 5, // Rates typically reset every 5 years
  },
  rentingRules: {
    typicalSecurityDeposit: 0.5, // Often last month's rent
    maxSecurityDeposit: 1,
    brokerFeesCommon: false,
    typicalBrokerFee: 0,
  },
  defaults: {
    propertyTaxRate: 0.01,
    homeInsuranceRate: 0.003,
    maintenanceRate: 0.01,
    inflationRate: 0.02,
    homePriceGrowth: 0.04,
    investmentReturn: 0.06,
  },
  labels: {
    transferTax: "Land Transfer Tax",
  },
};

/**
 * Mexico
 * - Limited mortgage interest deduction
 * - ISR (income tax) on property sales
 * - Notary fees are significant
 */
export const MX_CONFIG: CountryConfig = {
  code: "MX",
  name: "Mexico",
  currency: "MXN",
  taxRules: {
    mortgageInterestDeductible: true, // Limited
    maxDeductibleInterest: 3500000, // ~$175k USD equivalent
    capitalGainsTaxRate: 0.35, // ISR rate
    capitalGainsExemption: 700000, // UDIS limit for primary residence
    propertyTaxDeductible: false,
    standardDeduction: {
      single: 0,
      joint: 0,
    },
  },
  closingCosts: {
    notaryFees: 0.04, // 4-6% of property value
    transferTax: 0.02, // Acquisition tax (varies by state)
    transferTaxVariesByRegion: true,
    registrationFees: 0.01,
    agentCommission: 0.05,
    agentCommissionPaidBy: "seller",
  },
  mortgageRules: {
    typicalTerm: 20,
    availableTerms: [10, 15, 20],
    minDownPayment: 0.10,
    typicalDownPayment: 0.20,
    hasMortgageInsurance: true,
    mortgageInsuranceThreshold: 0.80,
    typicalRateType: "fixed",
  },
  rentingRules: {
    typicalSecurityDeposit: 1,
    maxSecurityDeposit: 1,
    brokerFeesCommon: true,
    typicalBrokerFee: 0.0833, // 1 month
  },
  defaults: {
    propertyTaxRate: 0.001, // Predial is very low
    homeInsuranceRate: 0.005,
    maintenanceRate: 0.015,
    inflationRate: 0.04,
    homePriceGrowth: 0.05,
    investmentReturn: 0.08,
  },
  labels: {
    propertyTax: "Predial",
  },
};

/**
 * Germany
 * - No mortgage interest deduction for owner-occupied
 * - No capital gains tax if held 10+ years
 * - High closing costs (Grunderwerbsteuer varies 3.5-6.5% by state)
 * - Notary mandatory
 */
export const DE_CONFIG: CountryConfig = {
  code: "DE",
  name: "Germany",
  currency: "EUR",
  taxRules: {
    mortgageInterestDeductible: false,
    capitalGainsTaxRate: 0.25, // Abgeltungssteuer
    capitalGainsExemption: Infinity, // Exempt if held 10+ years
    propertyTaxDeductible: false,
    standardDeduction: {
      single: 11604,
      joint: 23208,
    },
  },
  closingCosts: {
    notaryFees: 0.015, // ~1.5% mandatory
    transferTax: 0.05, // Grunderwerbsteuer: 3.5-6.5% depending on state
    transferTaxVariesByRegion: true,
    registrationFees: 0.005, // Grundbuchamt
    agentCommission: 0.0357, // 3.57% each side in some states
    agentCommissionPaidBy: "split",
  },
  mortgageRules: {
    typicalTerm: 30,
    availableTerms: [10, 15, 20, 25, 30],
    minDownPayment: 0.20, // Banks typically require 20%
    typicalDownPayment: 0.20,
    hasMortgageInsurance: false,
    mortgageInsuranceThreshold: 1,
    typicalRateType: "fixed",
    fixedRatePeriod: 10, // Zinsbindung typically 10-15 years
  },
  rentingRules: {
    typicalSecurityDeposit: 3, // Kaution up to 3 months
    maxSecurityDeposit: 3,
    brokerFeesCommon: false, // Bestellerprinzip - landlord pays
    typicalBrokerFee: 0,
  },
  defaults: {
    propertyTaxRate: 0.0025, // Grundsteuer is low
    homeInsuranceRate: 0.002,
    maintenanceRate: 0.01,
    inflationRate: 0.02,
    homePriceGrowth: 0.03,
    investmentReturn: 0.05,
  },
  labels: {
    propertyTax: "Grundsteuer",
    transferTax: "Grunderwerbsteuer",
  },
};

/**
 * France
 * - No mortgage interest deduction for primary residence
 * - Capital gains exempt on primary residence
 * - High notary fees (frais de notaire)
 * - Taxe foncière and taxe d'habitation
 */
export const FR_CONFIG: CountryConfig = {
  code: "FR",
  name: "France",
  currency: "EUR",
  taxRules: {
    mortgageInterestDeductible: false,
    capitalGainsTaxRate: 0.36, // 19% + 17.2% social charges
    capitalGainsExemption: Infinity, // Primary residence exempt
    propertyTaxDeductible: false,
    standardDeduction: {
      single: 0, // France uses different system
      joint: 0,
    },
  },
  closingCosts: {
    notaryFees: 0.08, // 7-8% for existing property, ~3% for new
    transferTax: 0, // Included in notary fees
    transferTaxVariesByRegion: false,
    registrationFees: 0, // Included in notary fees
    agentCommission: 0.05,
    agentCommissionPaidBy: "seller",
  },
  mortgageRules: {
    typicalTerm: 20,
    availableTerms: [10, 15, 20, 25],
    minDownPayment: 0.10,
    typicalDownPayment: 0.20,
    hasMortgageInsurance: true, // Assurance emprunteur mandatory
    mortgageInsuranceThreshold: 1, // Always required
    typicalRateType: "fixed",
  },
  rentingRules: {
    typicalSecurityDeposit: 1, // 1 month unfurnished, 2 furnished
    maxSecurityDeposit: 2,
    brokerFeesCommon: true,
    typicalBrokerFee: 0.0833, // ~1 month split
  },
  defaults: {
    propertyTaxRate: 0.01, // Taxe foncière
    homeInsuranceRate: 0.002,
    maintenanceRate: 0.01,
    inflationRate: 0.02,
    homePriceGrowth: 0.025,
    investmentReturn: 0.05,
  },
  labels: {
    propertyTax: "Taxe Foncière",
  },
};

/**
 * United Kingdom
 * - No mortgage interest deduction for primary residence
 * - Capital gains exempt on primary residence
 * - Stamp Duty Land Tax (SDLT) with progressive rates
 * - Council Tax instead of property tax
 */
export const GB_CONFIG: CountryConfig = {
  code: "GB",
  name: "United Kingdom",
  currency: "GBP",
  taxRules: {
    mortgageInterestDeductible: false,
    capitalGainsTaxRate: 0.24, // 18% basic, 24% higher rate
    capitalGainsExemption: Infinity, // Primary residence relief
    propertyTaxDeductible: false,
    standardDeduction: {
      single: 12570, // Personal allowance
      joint: 12570,
    },
  },
  closingCosts: {
    notaryFees: 0, // No notaries, use solicitors
    transferTax: 0.05, // SDLT varies, ~5% average
    transferTaxVariesByRegion: true, // Scotland has LBTT
    registrationFees: 0.002, // Land Registry
    agentCommission: 0.015, // 1-3%
    agentCommissionPaidBy: "seller",
  },
  mortgageRules: {
    typicalTerm: 25,
    availableTerms: [15, 20, 25, 30, 35],
    minDownPayment: 0.05,
    typicalDownPayment: 0.10,
    hasMortgageInsurance: false,
    mortgageInsuranceThreshold: 1,
    typicalRateType: "both",
    fixedRatePeriod: 5, // 2 or 5 year fixes common
  },
  rentingRules: {
    typicalSecurityDeposit: 1.15, // 5 weeks max (5/4.33 months)
    maxSecurityDeposit: 1.15, // Capped at 5 weeks rent
    brokerFeesCommon: false, // Banned in 2019
    typicalBrokerFee: 0,
  },
  defaults: {
    propertyTaxRate: 0.005, // Council Tax varies significantly
    homeInsuranceRate: 0.002,
    maintenanceRate: 0.01,
    inflationRate: 0.02,
    homePriceGrowth: 0.03,
    investmentReturn: 0.05,
  },
  labels: {
    propertyTax: "Council Tax",
    transferTax: "Stamp Duty",
  },
};

/**
 * Italy
 * - No mortgage interest deduction for primary residence (some exceptions)
 * - Capital gains exempt on primary residence after 5 years
 * - IMU property tax (exempt on primary residence in most cases)
 */
export const IT_CONFIG: CountryConfig = {
  code: "IT",
  name: "Italy",
  currency: "EUR",
  taxRules: {
    mortgageInterestDeductible: true, // 19% deduction up to €4000/year
    maxDeductibleInterest: 4000,
    capitalGainsTaxRate: 0.26,
    capitalGainsExemption: Infinity, // Exempt if primary residence 5+ years
    propertyTaxDeductible: false,
    standardDeduction: {
      single: 0,
      joint: 0,
    },
  },
  closingCosts: {
    notaryFees: 0.025, // 2-3%
    transferTax: 0.09, // 9% for second home, 2% for primary
    transferTaxVariesByRegion: false,
    registrationFees: 0.005,
    agentCommission: 0.04, // 2-4% each side
    agentCommissionPaidBy: "split",
  },
  mortgageRules: {
    typicalTerm: 25,
    availableTerms: [10, 15, 20, 25, 30],
    minDownPayment: 0.20,
    typicalDownPayment: 0.20,
    hasMortgageInsurance: false,
    mortgageInsuranceThreshold: 1,
    typicalRateType: "both",
  },
  rentingRules: {
    typicalSecurityDeposit: 3,
    maxSecurityDeposit: 3,
    brokerFeesCommon: true,
    typicalBrokerFee: 0.0833, // 1 month each
  },
  defaults: {
    propertyTaxRate: 0.004, // IMU varies, often exempt for primary
    homeInsuranceRate: 0.002,
    maintenanceRate: 0.01,
    inflationRate: 0.02,
    homePriceGrowth: 0.02,
    investmentReturn: 0.04,
  },
  labels: {
    propertyTax: "IMU",
  },
};

/**
 * Spain  
 * - Limited mortgage interest deduction (grandfathered for pre-2013)
 * - Capital gains exempt on primary residence if reinvested
 * - IBI (property tax) and ITP (transfer tax)
 */
export const ES_CONFIG: CountryConfig = {
  code: "ES",
  name: "Spain",
  currency: "EUR",
  taxRules: {
    mortgageInterestDeductible: false, // Removed in 2013
    capitalGainsTaxRate: 0.23, // Progressive 19-23%
    capitalGainsExemption: Infinity, // Exempt if reinvested in primary residence
    propertyTaxDeductible: false,
    standardDeduction: {
      single: 5550,
      joint: 5550,
    },
  },
  closingCosts: {
    notaryFees: 0.01, // ~1%
    transferTax: 0.08, // ITP 6-10% depending on region
    transferTaxVariesByRegion: true,
    registrationFees: 0.005,
    agentCommission: 0.05, // 3-5%
    agentCommissionPaidBy: "seller",
  },
  mortgageRules: {
    typicalTerm: 25,
    availableTerms: [15, 20, 25, 30],
    minDownPayment: 0.20,
    typicalDownPayment: 0.20,
    hasMortgageInsurance: false,
    mortgageInsuranceThreshold: 1,
    typicalRateType: "variable", // Euribor-linked common
  },
  rentingRules: {
    typicalSecurityDeposit: 1,
    maxSecurityDeposit: 2,
    brokerFeesCommon: true,
    typicalBrokerFee: 0.0833,
  },
  defaults: {
    propertyTaxRate: 0.006, // IBI varies by municipality
    homeInsuranceRate: 0.002,
    maintenanceRate: 0.01,
    inflationRate: 0.025,
    homePriceGrowth: 0.03,
    investmentReturn: 0.04,
  },
  labels: {
    propertyTax: "IBI",
    transferTax: "ITP",
  },
};

// Map of all country configurations
export const COUNTRY_CONFIGS: Record<CountryCode, CountryConfig> = {
  US: US_CONFIG,
  CA: CA_CONFIG,
  MX: MX_CONFIG,
  DE: DE_CONFIG,
  FR: FR_CONFIG,
  GB: GB_CONFIG,
  IT: IT_CONFIG,
  ES: ES_CONFIG,
};

/**
 * Get country config by code
 */
export function getCountryConfig(code: CountryCode): CountryConfig {
  return COUNTRY_CONFIGS[code];
}

/**
 * Get default calculator values for a country
 */
// Typical home prices and rents per country (for sensible defaults when switching)
const COUNTRY_MARKET_DEFAULTS: Record<CountryCode, {
  homePrice: number;
  monthlyRent: number;
  mortgageRate: number;
  extraPayments: number;
  monthlyRentersInsurance: number;
  marginalTaxRate: number;
  otherDeductions: number;
}> = {
  US: { homePrice: 500000, monthlyRent: 2000, mortgageRate: 0.0725, extraPayments: 100, monthlyRentersInsurance: 100, marginalTaxRate: 0.22, otherDeductions: 0 },
  CA: { homePrice: 700000, monthlyRent: 2200, mortgageRate: 0.055, extraPayments: 100, monthlyRentersInsurance: 50, marginalTaxRate: 0.29, otherDeductions: 0 },
  MX: { homePrice: 4000000, monthlyRent: 15000, mortgageRate: 0.12, extraPayments: 500, monthlyRentersInsurance: 200, marginalTaxRate: 0.30, otherDeductions: 0 },
  DE: { homePrice: 400000, monthlyRent: 1200, mortgageRate: 0.038, extraPayments: 100, monthlyRentersInsurance: 15, marginalTaxRate: 0.42, otherDeductions: 0 },
  FR: { homePrice: 350000, monthlyRent: 1100, mortgageRate: 0.035, extraPayments: 100, monthlyRentersInsurance: 15, marginalTaxRate: 0.30, otherDeductions: 0 },
  GB: { homePrice: 350000, monthlyRent: 1500, mortgageRate: 0.045, extraPayments: 100, monthlyRentersInsurance: 20, marginalTaxRate: 0.40, otherDeductions: 0 },
  IT: { homePrice: 250000, monthlyRent: 900, mortgageRate: 0.038, extraPayments: 80, monthlyRentersInsurance: 15, marginalTaxRate: 0.38, otherDeductions: 0 },
  ES: { homePrice: 250000, monthlyRent: 900, mortgageRate: 0.035, extraPayments: 80, monthlyRentersInsurance: 15, marginalTaxRate: 0.37, otherDeductions: 0 },
};

export function getCountryDefaults(code: CountryCode): Partial<CalculatorValues> {
  const config = COUNTRY_CONFIGS[code];
  const market = COUNTRY_MARKET_DEFAULTS[code];
  return {
    homePrice: market.homePrice,
    monthlyRent: market.monthlyRent,
    mortgageRate: market.mortgageRate,
    extraPayments: market.extraPayments,
    monthlyRentersInsurance: market.monthlyRentersInsurance,
    marginalTaxRate: market.marginalTaxRate,
    otherDeductions: market.otherDeductions,
    propertyTaxRate: config.defaults.propertyTaxRate,
    homeInsuranceRate: config.defaults.homeInsuranceRate,
    maintenanceRate: config.defaults.maintenanceRate,
    inflationRate: config.defaults.inflationRate,
    homePriceGrowth: config.defaults.homePriceGrowth,
    investmentReturn: config.defaults.investmentReturn,
    mortgageTerm: config.mortgageRules.typicalTerm,
    downPayment: config.mortgageRules.typicalDownPayment,
    buyingCosts: config.closingCosts.notaryFees + config.closingCosts.transferTax + config.closingCosts.registrationFees,
    sellingCosts: config.closingCosts.agentCommission,
    securityDeposit: config.rentingRules.typicalSecurityDeposit,
    brokerFee: config.rentingRules.typicalBrokerFee,
    pmi: config.mortgageRules.hasMortgageInsurance ? 0.005 : 0,
  };
}

/**
 * List of supported countries for UI
 */
export const SUPPORTED_COUNTRIES = [
  { code: "US" as CountryCode, name: "United States", flag: "🇺🇸" },
  { code: "CA" as CountryCode, name: "Canada", flag: "🇨🇦" },
  { code: "MX" as CountryCode, name: "Mexico", flag: "🇲🇽" },
  { code: "GB" as CountryCode, name: "United Kingdom", flag: "🇬🇧" },
  { code: "DE" as CountryCode, name: "Germany", flag: "🇩🇪" },
  { code: "FR" as CountryCode, name: "France", flag: "🇫🇷" },
  { code: "IT" as CountryCode, name: "Italy", flag: "🇮🇹" },
  { code: "ES" as CountryCode, name: "Spain", flag: "🇪🇸" },
];
