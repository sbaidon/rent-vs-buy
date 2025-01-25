import { Calculator } from "./calculator";
import { CalculatorValues } from "../context/calculator-context";

export class RentingCostsCalculator implements Calculator {
  private readonly CAPITAL_GAINST_RATE = 0.15;

  constructor(private values: CalculatorValues) {}

  private get effectiveReturnRate(): number {
    return this.values.investmentReturn * (1 - this.CAPITAL_GAINST_RATE);
  }

  private get initialOpportunityAdjustment(): number {
    return Math.pow(1 + this.effectiveReturnRate, this.values.yearsToStay) - 1;
  }

  private get securityDeposit(): number {
    return this.values.monthlyRent * this.values.securityDeposit;
  }

  getTotalCost(values?: CalculatorValues): number {
    if (values) {
      this.values = values;
    }
    return this.calculate(values).totalCost;
  }

  calculate(values?: CalculatorValues) {
    if (values) {
      this.values = values;
    }

    const brokerFeeAmount = this.values.monthlyRent * this.values.brokerFee;
    const rentInitialCosts = this.securityDeposit + brokerFeeAmount;
    const rentYearCostRate = 1 + this.values.rentGrowth;
    const rentInitialOpportunityCost =
      rentInitialCosts * this.initialOpportunityAdjustment;
    const rentFirstYear = this.values.monthlyRent * 12;

    let rentYearlyOpportunityCost = 0;
    let rentTotalYearCost = 0;
    let rentCost = 0;
    let rentInsuranceCost = 0;

    for (let year = 1; year <= this.values.yearsToStay; ++year) {
      const rentYearCost = rentFirstYear * Math.pow(rentYearCostRate, year - 1);

      // accumulate opportunity costs; this year’s costs counts towards next year’s lost opportunity
      rentYearlyOpportunityCost +=
        (rentYearlyOpportunityCost + rentTotalYearCost) *
        this.effectiveReturnRate;

      // accumulate yearly costs
      rentCost += rentYearCost;
      rentInsuranceCost += rentYearCost * this.values.rentersInsuranceRate;

      // recompute yearly totals
      rentTotalYearCost = rentCost + rentInsuranceCost;
    }

    // termination costs
    const rentTotalTerminationCost = -this.securityDeposit;

    // totals
    const rentTotalOpportunityCost =
      rentInitialOpportunityCost + rentYearlyOpportunityCost;
    const rentTotalCost =
      rentInitialCosts +
      rentTotalYearCost +
      rentTotalOpportunityCost +
      rentTotalTerminationCost;

    return {
      initialCost: rentInitialCosts,
      totalCost: rentTotalCost,
      recurringCost: rentTotalYearCost,
      opportunityCost: rentTotalOpportunityCost,
      netProceeds: -this.securityDeposit,
    };
  }
}
