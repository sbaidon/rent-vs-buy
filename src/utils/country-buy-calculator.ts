/**
 * Country-aware Buying Costs Calculator
 * 
 * Calculates the total cost of buying a home with country-specific:
 * - Tax deductions and benefits
 * - Closing costs structure
 * - Capital gains rules
 * - Mortgage insurance requirements
 */

import type { CalculatorValues } from "../context/calculator-context";
import type { CountryCode } from "../constants/country-rules";
import { getCountryConfig } from "../constants/country-rules";
import { getTaxCalculator, type CountryTaxCalculator } from "./taxes/index";
import type { CostCalculationResult } from "./calculator-factory";

export interface BuyingCalculationOptions {
  countryCode: CountryCode;
  values: CalculatorValues;
}

interface _YearlyCalculation {
  yearCost: number;
  principalPaid: number;
  interestPaid: number;
  propertyTax: number;
  insurance: number;
  maintenance: number;
  pmi: number;
  taxSavings: number;
  loanBalance: number;
  homeValue: number;
}

export class CountryBuyingCalculator {
  private readonly CAPITAL_GAINS_TAX_RATE = 0.15;
  private readonly config;
  private readonly taxCalculator: CountryTaxCalculator;
  private cachedResult: CostCalculationResult | null = null;

  constructor(
    private readonly countryCode: CountryCode,
    private values: CalculatorValues
  ) {
    this.config = getCountryConfig(countryCode);
    this.taxCalculator = getTaxCalculator(countryCode);
  }

  // ============================================================================
  // Derived Values
  // ============================================================================

  private get startYear(): number {
    return new Date().getFullYear();
  }

  private get effectiveReturnRate(): number {
    return this.values.investmentReturn * (1 - this.CAPITAL_GAINS_TAX_RATE);
  }

  private get inflationAdjustmentRate(): number {
    return 1 + this.values.inflationRate;
  }

  private get priceGrowthFactor(): number {
    return 1 + this.values.homePriceGrowth;
  }

  private get downPaymentAmount(): number {
    return this.values.downPayment * this.values.homePrice;
  }

  private get initialLoanPrincipal(): number {
    return this.values.homePrice - this.downPaymentAmount;
  }

  private get totalLoanMonths(): number {
    return this.values.mortgageTerm * 12;
  }

  private get monthlyLoanRate(): number {
    return this.values.mortgageRate / 12;
  }

  private get monthlyLoanPayment(): number {
    const principal = this.initialLoanPrincipal;
    const months = this.totalLoanMonths;
    const r = this.monthlyLoanRate;
    if (r === 0) return principal / months;
    return principal * (r / (1 - Math.pow(1 + r, -months)));
  }

  // ============================================================================
  // Closing Costs (Country-specific)
  // ============================================================================

  private get buyingClosingCosts(): number {
    // Use values from calculator if provided, otherwise use country defaults
    if (this.values.buyingCosts > 0) {
      return this.values.homePrice * this.values.buyingCosts;
    }

    const { closingCosts } = this.config;
    const baseCosts =
      closingCosts.notaryFees +
      closingCosts.transferTax +
      closingCosts.registrationFees;

    // Add buyer's share of agent commission if applicable
    const buyerAgentCost =
      closingCosts.agentCommissionPaidBy === "buyer"
        ? closingCosts.agentCommission
        : closingCosts.agentCommissionPaidBy === "split"
          ? closingCosts.agentCommission / 2
          : 0;

    return this.values.homePrice * (baseCosts + buyerAgentCost);
  }

  private getSellingClosingCosts(salePrice: number): number {
    if (this.values.sellingCosts > 0) {
      return salePrice * this.values.sellingCosts;
    }

    const { closingCosts } = this.config;
    const sellerAgentCost =
      closingCosts.agentCommissionPaidBy === "seller"
        ? closingCosts.agentCommission
        : closingCosts.agentCommissionPaidBy === "split"
          ? closingCosts.agentCommission / 2
          : 0;

    return salePrice * sellerAgentCost;
  }

  // ============================================================================
  // Initial Costs
  // ============================================================================

  private get initialCosts(): number {
    return this.downPaymentAmount + this.buyingClosingCosts;
  }

  // ============================================================================
  // Mortgage Insurance (PMI) - Country-specific
  // ============================================================================

  private isPMIRequired(loanBalance: number): boolean {
    if (!this.config.mortgageRules.hasMortgageInsurance) {
      return false;
    }
    const ltv = loanBalance / this.values.homePrice;
    return ltv > this.config.mortgageRules.mortgageInsuranceThreshold;
  }

  private calculatePMI(loanBalance: number): number {
    if (!this.isPMIRequired(loanBalance)) return 0;
    // PMI rate from values or default
    const pmiRate = this.values.pmi || 0.005;
    return loanBalance * pmiRate;
  }

  // ============================================================================
  // Yearly Calculations
  // ============================================================================

  private calculateLoanYear(
    principal: number,
    remainingMonths: number
  ): {
    newPrincipal: number;
    principalPaid: number;
    interestPaid: number;
    monthsUsed: number;
  } {
    const monthsThisYear = Math.min(remainingMonths, 12);
    const factor = Math.pow(1 + this.monthlyLoanRate, monthsThisYear);
    const totalPayment = this.monthlyLoanPayment * monthsThisYear;

    let newPrincipal = principal * factor - totalPayment;
    let actualMonthsUsed = monthsThisYear;

    if (newPrincipal < 0) {
      newPrincipal = 0;
      for (let month = 1; month <= monthsThisYear; month++) {
        const monthlyFactor = Math.pow(1 + this.monthlyLoanRate, month);
        const partialPayment = this.monthlyLoanPayment * month;
        if (principal * monthlyFactor - partialPayment <= 0) {
          actualMonthsUsed = month;
          break;
        }
      }
    }

    const principalPaid = principal - newPrincipal;
    const interestPaid =
      this.monthlyLoanPayment * actualMonthsUsed - principalPaid;

    return {
      newPrincipal,
      principalPaid,
      interestPaid,
      monthsUsed: actualMonthsUsed,
    };
  }

  private calculateYearlyTaxBenefits(
    year: number,
    loanBalance: number,
    interestPaid: number,
    propertyTaxPaid: number,
    homeValue: number
  ): number {
    const actualYear = this.startYear + year - 1;

    const benefits = this.taxCalculator.calculateDeductionBenefits({
      year: actualYear,
      homePrice: this.values.homePrice,
      currentHomeValue: homeValue,
      loanBalance,
      interestPaid,
      propertyTaxPaid,
      isJointReturn: this.values.isJointReturn,
      marginalTaxRate: this.values.marginalTaxRate,
      otherDeductions: this.values.otherDeductions,
      yearsOwned: year,
      taxCutsExpire: this.values.taxCutsExpire,
    });

    return benefits.deductionSavings;
  }

  // ============================================================================
  // Capital Gains Tax on Sale
  // ============================================================================

  private calculateCapitalGainsTax(salePrice: number): number {
    const result = this.taxCalculator.calculateCapitalGainsTax({
      purchasePrice: this.values.homePrice,
      salePrice,
      yearsOwned: this.values.yearsToStay,
      isJointReturn: this.values.isJointReturn,
      isPrimaryResidence: true,
    });

    return result.taxAmount;
  }

  // ============================================================================
  // Net Proceeds from Sale
  // ============================================================================

  private calculateNetProceeds(
    salePrice: number,
    remainingLoanBalance: number
  ): number {
    const sellingCosts = this.getSellingClosingCosts(salePrice);
    const capitalGainsTax = this.calculateCapitalGainsTax(salePrice);

    // Net proceeds = sale price - remaining loan - selling costs - capital gains tax
    return -(
      salePrice -
      remainingLoanBalance -
      sellingCosts -
      capitalGainsTax
    );
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

    // Track cumulative values
    let remainingLoanMonths = this.totalLoanMonths;
    let currentLoanPrincipal = this.initialLoanPrincipal;
    let cumulativeRecurringCost = 0;
    let cumulativeOpportunityCost = 0;
    let currentHomeValue = this.values.homePrice;

    const yearlyBreakdown: number[] = [];
    let _totalTaxSavings = 0;

    // Initial cost contribution to opportunity cost
    let currentYearCost = this.initialCosts;

    for (let year = 1; year <= yearsToStay; year++) {
      const inflationFactor = Math.pow(this.inflationAdjustmentRate, year - 1);
      currentHomeValue =
        this.values.homePrice * Math.pow(this.priceGrowthFactor, year);

      // Calculate opportunity cost on previous year's spending
      cumulativeOpportunityCost +=
        (cumulativeOpportunityCost + currentYearCost) * this.effectiveReturnRate;

      // Loan calculations
      let principalPaid = 0;
      let interestPaid = 0;
      if (remainingLoanMonths > 0) {
        const loanResults = this.calculateLoanYear(
          currentLoanPrincipal,
          remainingLoanMonths
        );
        currentLoanPrincipal = loanResults.newPrincipal;
        principalPaid = loanResults.principalPaid;
        interestPaid = loanResults.interestPaid;
        remainingLoanMonths -= loanResults.monthsUsed;
      }

      // Annual costs
      const propertyTax = currentHomeValue * this.values.propertyTaxRate;
      const insurance = currentHomeValue * this.values.homeInsuranceRate;
      const maintenance =
        this.values.homePrice * this.values.maintenanceRate * inflationFactor;
      const extraPayments = this.values.extraPayments * 12 * inflationFactor;
      const pmi = this.calculatePMI(currentLoanPrincipal);

      // Tax benefits (country-specific)
      const taxSavings = this.calculateYearlyTaxBenefits(
        year,
        currentLoanPrincipal + principalPaid, // Balance at start of year
        interestPaid,
        propertyTax,
        currentHomeValue
      );
      _totalTaxSavings += taxSavings;

      // Year cost (excluding principal which builds equity)
      const yearCost =
        principalPaid +
        interestPaid +
        propertyTax +
        insurance +
        maintenance +
        extraPayments +
        pmi -
        taxSavings;

      cumulativeRecurringCost += yearCost;
      currentYearCost = yearCost;

      // Build yearly breakdown
      let yearTotal = yearCost;
      if (year === 1) {
        yearTotal += this.initialCosts;
      }
      if (year === yearsToStay) {
        yearTotal += this.calculateNetProceeds(
          currentHomeValue,
          currentLoanPrincipal
        );
      }

      yearlyBreakdown.push(yearTotal);
    }

    // Calculate opportunity cost on initial investment
    const initialOpportunityCost =
      this.initialCosts *
      (Math.pow(1 + this.effectiveReturnRate, yearsToStay) - 1);
    const totalOpportunityCost =
      initialOpportunityCost + cumulativeOpportunityCost;

    // Net proceeds from selling
    const netProceeds = this.calculateNetProceeds(
      currentHomeValue,
      currentLoanPrincipal
    );

    // Total cost
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
 * Factory function to create a country-specific buying calculator
 */
export function createBuyingCalculator(
  countryCode: CountryCode,
  values: CalculatorValues
): CountryBuyingCalculator {
  return new CountryBuyingCalculator(countryCode, values);
}
