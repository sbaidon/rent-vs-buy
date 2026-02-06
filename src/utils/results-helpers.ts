/**
 * Computation helpers for the results view.
 *
 * Extracted from tabbed-results.tsx so they can be reused and tested
 * independently.
 */

import type { CalculatorValues } from "../context/calculator-context";
import type { CountryCode } from "../constants/country-rules";
import { createBuyingCalculator } from "./country-buy-calculator";
import { createRentingCalculator } from "./country-rent-calculator";

// ============================================================================
// Break-even analysis
// ============================================================================

/**
 * Find the break-even year: the first year where cumulative buying cost
 * drops below cumulative renting cost. Returns null if buying never
 * becomes cheaper within the analysis period.
 */
export function findBreakEvenYear(
  buyYearly: number[],
  rentYearly: number[]
): number | null {
  let buyCumulative = 0;
  let rentCumulative = 0;

  for (let i = 0; i < buyYearly.length; i++) {
    buyCumulative += buyYearly[i];
    rentCumulative += rentYearly[i];

    if (buyCumulative <= rentCumulative) {
      return i + 1; // 1-indexed year
    }
  }

  return null;
}

// ============================================================================
// Equity vs Portfolio
// ============================================================================

/**
 * Build wealth-accumulation data: home equity vs. renter's investment portfolio.
 *
 * Home equity = current home value - remaining loan balance
 * Renter portfolio = cumulative (buy_cost - rent_cost) invested at returns rate
 */
export function buildEquityData(
  values: CalculatorValues,
  country: CountryCode,
  yearsToStay: number
): { year: number; homeEquity: number; portfolio: number }[] {
  const data: { year: number; homeEquity: number; portfolio: number }[] = [];

  const loanAmount = values.homePrice * (1 - values.downPayment);
  const monthlyRate = values.mortgageRate / 12;
  const totalMonths = values.mortgageTerm * 12;
  const monthlyPayment =
    monthlyRate > 0
      ? (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalMonths))
      : loanAmount / totalMonths;

  let remainingBalance = loanAmount;
  const effectiveReturn = values.investmentReturn * (1 - 0.15); // after-tax
  let portfolio = values.homePrice * values.downPayment; // down payment into portfolio
  // Add buying closing costs to portfolio (renter keeps this)
  portfolio += values.homePrice * values.buyingCosts;

  for (let year = 1; year <= yearsToStay; year++) {
    // Home equity
    const homeValue = values.homePrice * Math.pow(1 + values.homePriceGrowth, year);

    // Pay down mortgage for 12 months
    for (let m = 0; m < 12; m++) {
      if (remainingBalance <= 0) break;
      const interest = remainingBalance * monthlyRate;
      const principal = Math.min(monthlyPayment - interest, remainingBalance);
      remainingBalance -= principal;
    }

    const homeEquity = homeValue - Math.max(0, remainingBalance);

    // Renter portfolio: grows at effective return rate
    // Renter invests the difference between buying costs and renting costs per year
    const rentCost = values.monthlyRent * 12 * Math.pow(1 + values.rentGrowth, year - 1);
    const buyCost =
      monthlyPayment * 12 +
      homeValue * (values.propertyTaxRate + values.homeInsuranceRate + values.maintenanceRate) +
      values.extraPayments * 12;

    const surplus = buyCost - rentCost;

    // Portfolio grows, then surplus is added
    portfolio = portfolio * (1 + effectiveReturn) + Math.max(0, surplus);

    data.push({ year, homeEquity, portfolio });
  }

  return data;
}

// ============================================================================
// Sensitivity analysis
// ============================================================================

export interface SensitivityResult {
  parameter: string;
  key: keyof CalculatorValues;
  lowLabel: string;
  highLabel: string;
  /** Positive = favours buying, Negative = favours renting */
  lowImpact: number;
  /** Positive = favours buying, Negative = favours renting */
  highImpact: number;
}

/**
 * Sensitivity analysis: compute how total buying cost changes when a key
 * parameter is shifted by +/- delta.
 */
export function computeSensitivity(
  country: CountryCode,
  baseValues: CalculatorValues,
  baseBuyingCost: number,
  baseRentingCost: number,
): SensitivityResult[] {
  const params: {
    key: keyof CalculatorValues;
    label: string;
    delta: number;
    format: (v: number) => string;
  }[] = [
    { key: "mortgageRate", label: "Mortgage Rate", delta: 0.01, format: (v) => `${(v * 100).toFixed(1)}%` },
    { key: "homePriceGrowth", label: "Home Price Growth", delta: 0.01, format: (v) => `${(v * 100).toFixed(1)}%` },
    { key: "investmentReturn", label: "Investment Return", delta: 0.01, format: (v) => `${(v * 100).toFixed(1)}%` },
    { key: "yearsToStay", label: "Years to Stay", delta: 2, format: (v) => `${v}yr` },
  ];

  const baseDiff = baseBuyingCost - baseRentingCost; // positive = renting wins

  return params.map(({ key, label, delta, format }) => {
    const lowVal = (baseValues[key] as number) - delta;
    const highVal = (baseValues[key] as number) + delta;

    const lowValues = { ...baseValues, [key]: lowVal };
    const highValues = { ...baseValues, [key]: highVal };

    const lowBuy = createBuyingCalculator(country, lowValues).calculate().totalCost;
    const lowRent = createRentingCalculator(country, lowValues).calculate().totalCost;
    const lowDiff = lowBuy - lowRent;

    const highBuy = createBuyingCalculator(country, highValues).calculate().totalCost;
    const highRent = createRentingCalculator(country, highValues).calculate().totalCost;
    const highDiff = highBuy - highRent;

    return {
      parameter: label,
      key,
      lowLabel: format(lowVal),
      highLabel: format(highVal),
      lowImpact: baseDiff - lowDiff,
      highImpact: baseDiff - highDiff,
    };
  });
}
