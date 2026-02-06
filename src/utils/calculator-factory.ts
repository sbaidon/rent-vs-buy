/**
 * Calculator Factory
 * 
 * Creates country-specific calculators that use the appropriate
 * tax rules, closing costs, and default values for each country.
 */

import type { CalculatorValues } from "../context/calculator-context";
import type { CountryCode, CountryConfig } from "../constants/country-rules";
import { getCountryConfig, getCountryDefaults } from "../constants/country-rules";
import { getTaxCalculator, type CountryTaxCalculator } from "./taxes/index";

/**
 * Extended calculator values that include country-specific data
 */
export interface CountryCalculatorValues extends CalculatorValues {
  countryCode: CountryCode;
}

/**
 * Context object passed to calculators containing country-specific services
 */
export interface CalculatorContext {
  countryCode: CountryCode;
  config: CountryConfig;
  taxCalculator: CountryTaxCalculator;
}

/**
 * Creates a calculator context for a given country
 */
export function createCalculatorContext(countryCode: CountryCode): CalculatorContext {
  return {
    countryCode,
    config: getCountryConfig(countryCode),
    taxCalculator: getTaxCalculator(countryCode),
  };
}

/**
 * Merges country defaults with user-provided values
 * Country defaults are used as fallbacks for values not explicitly set
 */
export function applyCountryDefaults(
  values: Partial<CalculatorValues>,
  countryCode: CountryCode
): CalculatorValues {
  const countryDefaults = getCountryDefaults(countryCode);
  const baseDefaults = getBaseDefaults();
  
  return {
    ...baseDefaults,
    ...countryDefaults,
    ...values,
  } as CalculatorValues;
}

/**
 * Base defaults that apply to all countries
 */
function getBaseDefaults(): Partial<CalculatorValues> {
  return {
    homePrice: 500000,
    monthlyRent: 2000,
    mortgageRate: 0.0725,
    yearsToStay: 10,
    isJointReturn: true,
    marginalTaxRate: 0.22,
    otherDeductions: 0,
    taxCutsExpire: true,
    monthlyRentersInsurance: 100,
    isNewBuild: false,
    isFirstTimeBuyer: false,
    isPrimaryResidence: true,
    willReinvest: true,
  };
}

/**
 * Calculates the effective closing costs based on country rules
 */
export function calculateClosingCosts(
  homePrice: number,
  config: CountryConfig,
  isBuying: boolean
): number {
  const { closingCosts } = config;
  
  if (isBuying) {
    return homePrice * (
      closingCosts.notaryFees +
      closingCosts.transferTax +
      closingCosts.registrationFees +
      // Add buyer's share of agent commission if applicable
      (closingCosts.agentCommissionPaidBy === "buyer" || closingCosts.agentCommissionPaidBy === "split"
        ? closingCosts.agentCommission / (closingCosts.agentCommissionPaidBy === "split" ? 2 : 1)
        : 0)
    );
  } else {
    // Selling costs
    return homePrice * (
      closingCosts.agentCommission *
      (closingCosts.agentCommissionPaidBy === "seller" || closingCosts.agentCommissionPaidBy === "split"
        ? (closingCosts.agentCommissionPaidBy === "split" ? 0.5 : 1)
        : 0)
    );
  }
}

/**
 * Determines if mortgage insurance (PMI) is required based on country rules
 */
export function isMortgageInsuranceRequired(
  downPaymentPercent: number,
  config: CountryConfig
): boolean {
  if (!config.mortgageRules.hasMortgageInsurance) {
    return false;
  }
  
  const ltv = 1 - downPaymentPercent;
  return ltv > config.mortgageRules.mortgageInsuranceThreshold;
}

/**
 * Gets the typical security deposit amount based on country rules
 */
export function calculateSecurityDeposit(
  monthlyRent: number,
  config: CountryConfig
): number {
  return monthlyRent * config.rentingRules.typicalSecurityDeposit;
}

/**
 * Gets the broker fee based on country rules
 */
export function calculateBrokerFee(
  monthlyRent: number,
  config: CountryConfig
): number {
  if (!config.rentingRules.brokerFeesCommon) {
    return 0;
  }
  return monthlyRent * 12 * config.rentingRules.typicalBrokerFee;
}

/**
 * Validates that calculator values are within reasonable ranges for a country
 */
export function validateValues(
  values: CalculatorValues,
  config: CountryConfig
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  // Check down payment against country minimums
  if (values.downPayment < config.mortgageRules.minDownPayment) {
    warnings.push(
      `Down payment (${(values.downPayment * 100).toFixed(1)}%) is below typical minimum ` +
      `(${(config.mortgageRules.minDownPayment * 100).toFixed(1)}%) for ${config.name}`
    );
  }
  
  // Check mortgage term against available terms
  if (!config.mortgageRules.availableTerms.includes(values.mortgageTerm)) {
    warnings.push(
      `${values.mortgageTerm}-year mortgage is uncommon in ${config.name}. ` +
      `Typical terms: ${config.mortgageRules.availableTerms.join(", ")} years`
    );
  }
  
  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Type for the result of cost calculations
 */
export interface CostCalculationResult {
  initialCost: number;
  recurringCost: number;
  opportunityCost: number;
  netProceeds: number;
  totalCost: number;
  yearlyBreakdown: number[];
}
