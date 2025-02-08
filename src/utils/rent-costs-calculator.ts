import { Calculator } from "./calculator";
import { CalculatorValues } from "../context/calculator-context";

export class RentingCostsCalculator implements Calculator {
  private readonly CAPITAL_GAINS_RATE = 0.15;

  constructor(private values: CalculatorValues) {}

  private get effectiveReturnRate(): number {
    return this.values.investmentReturn * (1 - this.CAPITAL_GAINS_RATE);
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

    let yearlyOpportunityCost = 0;
    let rentTotalYearCost = 0;
    let rentCost = 0;
    let rentInsuranceCost = 0;
    let cumulativeCost = 0; // Start with security deposit + broker fee

    const yearlyBreakdown = [];

    for (let year = 1; year <= this.values.yearsToStay; ++year) {
      const rentYearCost = rentFirstYear * Math.pow(rentYearCostRate, year - 1);
      const yearInsurance = this.values.monthlyRentersInsurance * 12;

      // Calculate opportunity cost on the previous cumulative amount
      yearlyOpportunityCost +=
        (yearlyOpportunityCost + rentTotalYearCost) * this.effectiveReturnRate;

      rentCost += rentYearCost;
      rentInsuranceCost += yearInsurance;
      rentTotalYearCost = rentCost + rentInsuranceCost;

      cumulativeCost =
        rentInitialCosts +
        rentInitialOpportunityCost +
        rentTotalYearCost +
        yearlyOpportunityCost;

      if (year === this.values.yearsToStay) {
        cumulativeCost -= this.securityDeposit;
      }

      yearlyBreakdown.push(cumulativeCost);
    }

    const rentTotalOpportunityCost =
      rentInitialOpportunityCost + yearlyOpportunityCost;

    return {
      initialCost: rentInitialCosts,
      totalCost: yearlyBreakdown[this.values.yearsToStay - 1],
      recurringCost: rentTotalYearCost,
      opportunityCost: rentTotalOpportunityCost,
      netProceeds: -this.securityDeposit,
      yearlyBreakdown,
    };
  }
}
