/**
 * Country-aware Renting Costs Calculator
 * 
 * Calculates the total cost of renting with country-specific:
 * - Security deposit rules
 * - Broker fee structures
 * - Insurance costs
 */

import type { CalculatorValues } from "../context/calculator-context";
import type { CountryCode } from "../constants/country-rules";
import { getCountryConfig } from "../constants/country-rules";
import type { CostCalculationResult } from "./calculator-factory";

export class CountryRentingCalculator {
  private readonly CAPITAL_GAINS_RATE = 0.15;
  private readonly config;
  private cachedResult: CostCalculationResult | null = null;

  constructor(
    private readonly countryCode: CountryCode,
    private values: CalculatorValues
  ) {
    this.config = getCountryConfig(countryCode);
  }

  // ============================================================================
  // Derived Values
  // ============================================================================

  private get effectiveReturnRate(): number {
    return this.values.investmentReturn * (1 - this.CAPITAL_GAINS_RATE);
  }

  private get initialOpportunityAdjustment(): number {
    return (
      Math.pow(1 + this.effectiveReturnRate, this.values.yearsToStay) - 1
    );
  }

  // ============================================================================
  // Security Deposit (Country-specific)
  // ============================================================================

  private get securityDeposit(): number {
    // Use explicit value if provided, otherwise use country default
    if (this.values.securityDeposit > 0) {
      return this.values.monthlyRent * this.values.securityDeposit;
    }

    // Country-specific default
    const { rentingRules } = this.config;
    return this.values.monthlyRent * rentingRules.typicalSecurityDeposit;
  }

  private get maxSecurityDeposit(): number {
    const { rentingRules } = this.config;
    if (rentingRules.maxSecurityDeposit) {
      return this.values.monthlyRent * rentingRules.maxSecurityDeposit;
    }
    return Infinity;
  }

  private get effectiveSecurityDeposit(): number {
    return Math.min(this.securityDeposit, this.maxSecurityDeposit);
  }

  // ============================================================================
  // Broker Fee (Country-specific)
  // ============================================================================

  private get brokerFee(): number {
    // Use explicit value if provided
    if (this.values.brokerFee > 0) {
      return this.values.monthlyRent * this.values.brokerFee;
    }

    const { rentingRules } = this.config;

    // Some countries have banned broker fees for renters (UK, Germany)
    if (!rentingRules.brokerFeesCommon) {
      return 0;
    }

    // Typical broker fee as fraction of annual rent
    return this.values.monthlyRent * 12 * rentingRules.typicalBrokerFee;
  }

  // ============================================================================
  // Initial Costs
  // ============================================================================

  private get initialCosts(): number {
    return this.effectiveSecurityDeposit + this.brokerFee;
  }

  // ============================================================================
  // Annual Renting Costs
  // ============================================================================

  private calculateAnnualRent(year: number): number {
    const annualRentGrowthFactor = 1 + this.values.rentGrowth;
    return this.values.monthlyRent * 12 * Math.pow(annualRentGrowthFactor, year - 1);
  }

  private get annualInsurance(): number {
    return this.values.monthlyRentersInsurance * 12;
  }

  // ============================================================================
  // Main Calculation
  // ============================================================================

  calculate(newValues?: CalculatorValues): CostCalculationResult {
    if (newValues) {
      this.values = newValues;
      this.cachedResult = null;
    }

    if (this.cachedResult) {
      return this.cachedResult;
    }

    const { yearsToStay } = this.values;

    // Opportunity cost on initial outlay
    const initialOpportunityCost =
      this.initialCosts * this.initialOpportunityAdjustment;

    // Track cumulative costs
    let cumulativeRentCost = 0;
    let cumulativeInsuranceCost = 0;
    let cumulativeRecurringCost = 0;
    let cumulativeOpportunityCost = 0;

    const yearlyBreakdown: number[] = [];

    for (let year = 1; year <= yearsToStay; year++) {
      const annualRent = this.calculateAnnualRent(year);
      const annualInsurance = this.annualInsurance;

      // Calculate opportunity cost on previous spending
      cumulativeOpportunityCost +=
        (cumulativeOpportunityCost + cumulativeRecurringCost) *
        this.effectiveReturnRate;

      // Add this year's costs
      cumulativeRentCost += annualRent;
      cumulativeInsuranceCost += annualInsurance;
      cumulativeRecurringCost = cumulativeRentCost + cumulativeInsuranceCost;

      // Year cost for breakdown
      let yearCost = annualRent + annualInsurance;
      if (year === 1) {
        yearCost += this.initialCosts;
      }
      if (year === yearsToStay) {
        // Get security deposit back (assuming no damages)
        yearCost -= this.effectiveSecurityDeposit;
      }

      yearlyBreakdown.push(yearCost);
    }

    const totalOpportunityCost =
      initialOpportunityCost + cumulativeOpportunityCost;

    // Net proceeds = security deposit returned
    const netProceeds = -this.effectiveSecurityDeposit;

    const totalCost =
      this.initialCosts +
      cumulativeRecurringCost +
      totalOpportunityCost +
      netProceeds;

    // Add prorated opportunity cost to yearly breakdown
    const yearlyOpportunityCost = totalOpportunityCost / yearsToStay;
    const adjustedYearlyBreakdown = yearlyBreakdown.map(
      (cost) => cost + yearlyOpportunityCost
    );

    this.cachedResult = {
      initialCost: this.initialCosts,
      recurringCost: cumulativeRecurringCost,
      opportunityCost: totalOpportunityCost,
      netProceeds,
      totalCost,
      yearlyBreakdown: adjustedYearlyBreakdown,
    };

    return this.cachedResult;
  }

  /**
   * Get just the total cost (for comparison calculations)
   */
  getTotalCost(newValues?: CalculatorValues): number {
    return this.calculate(newValues).totalCost;
  }
}

/**
 * Factory function to create a country-specific renting calculator
 */
export function createRentingCalculator(
  countryCode: CountryCode,
  values: CalculatorValues
): CountryRentingCalculator {
  return new CountryRentingCalculator(countryCode, values);
}
