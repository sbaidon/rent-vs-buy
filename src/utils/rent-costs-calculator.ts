import { Calculator } from "./calculator";
import { CalculatorValues } from "../context/calculator-context";

export interface RentingBreakdown {
  /** Up-front costs (security deposit + broker fee) */
  initialCost: number;
  /** Total cost over the tenancy period (including opportunity cost) */
  totalCost: number;
  /** Sum of all rent and insurance payments over the years */
  recurringCost: number;
  /** Total opportunity cost accumulated over time */
  opportunityCost: number;
  /** Net cash returned at the end (e.g. refunding the security deposit) */
  netProceeds: number;
  /** Running total cost at the end of each year */
  yearlyBreakdown: number[];
}

export class RentingCostsCalculator implements Calculator {
  private readonly CAPITAL_GAINS_RATE = 0.15;
  private _calculationResult: RentingBreakdown | null = null;

  constructor(private values: CalculatorValues) {}

  // --- Derived Getters ---

  /**
   * Effective return rate after accounting for capital gains tax.
   */
  private get effectiveReturnRate(): number {
    return this.values.investmentReturn * (1 - this.CAPITAL_GAINS_RATE);
  }

  /**
   * Overall opportunity adjustment on the initial outlay over the entire period.
   */
  private get initialOpportunityAdjustment(): number {
    return Math.pow(1 + this.effectiveReturnRate, this.values.yearsToStay) - 1;
  }

  /**
   * The security deposit amount, based on the monthly rent and deposit multiplier.
   */
  private get securityDeposit(): number {
    return this.values.monthlyRent * this.values.securityDeposit;
  }

  // --- Public API ---

  /**
   * Returns the total cost of renting over the specified period.
   */
  getTotalCost(values?: CalculatorValues): number {
    if (values) {
      this.values = values;
      this._calculationResult = null;
    }
    return this.calculate().totalCost;
  }

  /**
   * Computes and returns a detailed breakdown of the renting costs.
   * This implementation preserves the original ordering:
   * the opportunity cost is updated first before adding the current year's recurring costs.
   */
  calculate(values?: CalculatorValues): RentingBreakdown {
    if (values) {
      this.values = values;
      this._calculationResult = null;
    }
    if (this._calculationResult) {
      return this._calculationResult;
    }

    // --- Initial Costs ---
    // Broker fee is computed as a fraction of the monthly rent.
    const brokerFee = this.values.monthlyRent * this.values.brokerFee;
    const initialCosts = this.securityDeposit + brokerFee;

    // Opportunity cost on the initial outlay over the entire tenancy period.
    const initialOpportunityCost =
      initialCosts * this.initialOpportunityAdjustment;

    // --- Recurring Costs Setup ---
    // Rent for the first year and its annual growth factor.
    const firstYearRent = this.values.monthlyRent * 12;
    const annualRentGrowthFactor = 1 + this.values.rentGrowth;

    // Initialize accumulators for recurring payments and opportunity cost.
    let cumulativeRentCost = 0;
    let cumulativeInsuranceCost = 0;
    let cumulativeRecurringCost = 0;
    let cumulativeOpportunityCost = 0;
    const yearlyBreakdown: number[] = [];

    // --- Loop Through Each Year ---
    for (let year = 1; year <= this.values.yearsToStay; year++) {
      // Calculate annual rent cost (which grows each year).
      const annualRent =
        firstYearRent * Math.pow(annualRentGrowthFactor, year - 1);
      // Annual renters insurance cost remains constant.
      const annualInsurance = this.values.monthlyRentersInsurance * 12;

      // **First, update opportunity cost** based on the previous cumulative recurring amounts.
      cumulativeOpportunityCost +=
        (cumulativeOpportunityCost + cumulativeRecurringCost) *
        this.effectiveReturnRate;

      // **Then update the recurring costs** by adding the current year's values.
      cumulativeRentCost += annualRent;
      cumulativeInsuranceCost += annualInsurance;
      cumulativeRecurringCost = cumulativeRentCost + cumulativeInsuranceCost;

      // Calculate the cumulative total cost for this year:
      // initial costs + opportunity cost on initial outlay + recurring costs + cumulative opportunity cost.
      let totalCostForYear =
        initialCosts +
        initialOpportunityCost +
        cumulativeRecurringCost +
        cumulativeOpportunityCost;

      // At the end of the tenancy, the security deposit is assumed to be returned.
      if (year === this.values.yearsToStay) {
        totalCostForYear -= this.securityDeposit;
      }

      yearlyBreakdown.push(totalCostForYear);
    }

    const totalOpportunityCost =
      initialOpportunityCost + cumulativeOpportunityCost;

    const result: RentingBreakdown = {
      initialCost: initialCosts,
      totalCost: yearlyBreakdown[this.values.yearsToStay - 1],
      recurringCost: cumulativeRecurringCost,
      opportunityCost: totalOpportunityCost,
      netProceeds: -this.securityDeposit,
      yearlyBreakdown,
    };

    this._calculationResult = result;
    return result;
  }
}
