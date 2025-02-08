import { Calculator } from "./calculator";
import { CalculatorValues } from "../context/calculator-context";
import { TaxesCalculator } from "./taxes";

export type AmortizationData = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  totalInterest: number;
};

interface RecurringCosts {
  opportunityCost: number;
  currentYearPrice: number;
  totalYearCost: number;
  remainingLoanPrincipal: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  totalPMIPaid: number;
  totalCommonCharges: number;
  totalPropertyTaxes: number;
  totalUtilitiesCost: number;
  totalMaintenanceCost: number;
  totalInsuranceCost: number;
  yearlyBreakdown: number[];
}

export class BuyingCostsCalculator implements Calculator {
  private readonly CAPITAL_GAINS_TAX_RATE = 0.15;
  private readonly CAPITAL_GAINS_EXCLUSION = 500_000;
  private readonly taxParameters = new TaxesCalculator();

  private _recurringCosts: RecurringCosts | null = null;

  constructor(private values: CalculatorValues) {}

  // --- Getters for Derived Values ---
  private get startYear(): number {
    return new Date().getFullYear();
  }

  private get effectiveReturnRate(): number {
    return this.values.investmentReturn * (1 - this.CAPITAL_GAINS_TAX_RATE);
  }

  private get inflationAdjustmentRate(): number {
    return 1 + this.values.inflationRate;
  }

  private get initialOpportunityAdjustment(): number {
    return Math.pow(1 + this.effectiveReturnRate, this.values.yearsToStay) - 1;
  }

  private get priceGrowthFactor(): number {
    return 1 + this.values.homePriceGrowth;
  }

  private get totalLoanMonths(): number {
    return this.values.mortgageTerm * 12;
  }

  private get monthlyLoanRate(): number {
    return this.values.mortgageRate / 12;
  }

  private get propertyTaxRate(): number {
    return this.values.propertyTaxRate;
  }

  private get firstYearMaintenanceCost(): number {
    return this.values.homePrice * this.values.maintenanceRate;
  }

  private get downPaymentAmount(): number {
    return this.values.downPayment * this.values.homePrice;
  }

  private get extraPaymentsAnnual(): number {
    return this.values.extraPayments * 12;
  }

  private get initialLoanPrincipal(): number {
    return this.values.homePrice - this.downPaymentAmount;
  }

  private get monthlyLoanPayment(): number {
    const principal = this.initialLoanPrincipal;
    const months = this.totalLoanMonths;
    const r = this.monthlyLoanRate;
    if (r === 0) {
      return principal / months;
    }
    return principal * (r / (1 - Math.pow(1 + r, -months)));
  }

  private get firstYearCommonCharge(): number {
    return (
      this.values.commonChargePerMonth *
      12 *
      (1 - this.values.marginalTaxRate * this.values.commonChargeDeductionRate)
    );
  }

  private get closingCost(): number {
    return this.values.homePrice * this.values.buyingCosts;
  }

  private get initialCosts(): number {
    return this.downPaymentAmount + this.closingCost;
  }

  // --- Helper Methods ---
  /**
   * Calculate the amortization details for a given year.
   */
  private calculateLoanYear(
    principal: number,
    remainingMonths: number,
    loanCap: number
  ): {
    newPrincipal: number;
    principalPaid: number;
    interestPaid: number;
    deductibleInterest: number;
    monthsUsed: number;
  } {
    const monthsThisYear = Math.min(remainingMonths, 12);
    const factor = Math.pow(1 + this.monthlyLoanRate, monthsThisYear);
    const totalPayment = this.monthlyLoanPayment * monthsThisYear;
    const newPrincipal = principal * factor - totalPayment;
    const principalPaid = principal - newPrincipal;
    const interestPaid = totalPayment - principalPaid;
    const deductibleFraction = loanCap / principal;
    const deductibleInterest =
      deductibleFraction < 1 ? interestPaid * deductibleFraction : interestPaid;
    return {
      newPrincipal,
      principalPaid,
      interestPaid,
      deductibleInterest,
      monthsUsed: monthsThisYear,
    };
  }

  /**
   * Compute and cache all recurring yearly costs.
   */
  private calculateRecurringCosts(): RecurringCosts {
    if (this._recurringCosts) {
      return this._recurringCosts;
    }

    const { homePrice, pmi, homeInsuranceRate, yearsToStay } = this.values;
    let cumulativeOpportunityCost = 0;
    let totalPrincipalPaid = 0;
    let totalInterestPaid = 0;
    let totalPMIPaid = 0;
    let totalCommonCharges = 0;
    let totalPropertyTaxes = 0;
    let totalUtilitiesCost = 0;
    let totalMaintenanceCost = 0;
    let totalInsuranceCost = 0;
    let totalSavingsFromDeductions = 0;
    let currentYearCost = this.initialCosts;

    let remainingLoanMonths = this.totalLoanMonths;
    let currentLoanPrincipal = this.initialLoanPrincipal;
    let currentYearPrice = 0;
    const yearlyBreakdown: number[] = [];

    for (let year = 1; year <= yearsToStay; year++) {
      const actualYear = this.startYear + year - 1;
      const inflationFactor = Math.pow(this.inflationAdjustmentRate, year - 1);
      currentYearPrice = homePrice * Math.pow(this.priceGrowthFactor, year);

      // Update opportunity cost based on cumulative cost so far.
      cumulativeOpportunityCost +=
        (cumulativeOpportunityCost + currentYearCost) *
        this.effectiveReturnRate;

      if (remainingLoanMonths > 0) {
        const loanCap = this.taxParameters.getLoanCap(
          actualYear,
          this.values.taxCutsExpire,
          this.values.isJointReturn
        );

        const {
          newPrincipal,
          principalPaid,
          interestPaid,
          deductibleInterest,
          monthsUsed,
        } = this.calculateLoanYear(
          currentLoanPrincipal,
          remainingLoanMonths,
          loanCap
        );

        currentLoanPrincipal = newPrincipal;
        totalPrincipalPaid += principalPaid;
        totalInterestPaid += interestPaid;
        remainingLoanMonths -= monthsUsed;

        // PMI cost if loan-to-value is above 80%
        if (pmi !== 0 && currentLoanPrincipal / homePrice > 0.8) {
          totalPMIPaid += currentLoanPrincipal * pmi;
        }

        totalSavingsFromDeductions += this.taxDeductions(
          currentYearPrice,
          actualYear,
          inflationFactor,
          deductibleInterest
        );
      }

      totalCommonCharges += this.firstYearCommonCharge * inflationFactor;
      totalPropertyTaxes += currentYearPrice * this.propertyTaxRate;
      totalUtilitiesCost += this.extraPaymentsAnnual * inflationFactor;
      totalMaintenanceCost += this.firstYearMaintenanceCost * inflationFactor;
      totalInsuranceCost += currentYearPrice * homeInsuranceRate;

      currentYearCost =
        totalPrincipalPaid +
        totalInterestPaid +
        totalCommonCharges +
        totalPropertyTaxes +
        totalUtilitiesCost +
        totalMaintenanceCost +
        totalInsuranceCost +
        totalPMIPaid -
        totalSavingsFromDeductions;

      let cumulativeCost = this.initialCosts + currentYearCost;
      if (year === yearsToStay) {
        cumulativeCost = this.totalCost(
          currentYearCost,
          cumulativeOpportunityCost,
          currentLoanPrincipal,
          currentYearPrice
        );
      }
      yearlyBreakdown.push(cumulativeCost);
    }

    this._recurringCosts = {
      opportunityCost: cumulativeOpportunityCost,
      currentYearPrice,
      totalYearCost: currentYearCost,
      remainingLoanPrincipal: currentLoanPrincipal,
      totalPrincipalPaid,
      totalInterestPaid,
      totalPMIPaid,
      totalCommonCharges,
      totalPropertyTaxes,
      totalUtilitiesCost,
      totalMaintenanceCost,
      totalInsuranceCost,
      yearlyBreakdown,
    };

    return this._recurringCosts;
  }

  private taxDeductions(
    currentYearPrice: number,
    actualYear: number,
    inflationFactor: number,
    annualDeductibleInterest: number
  ): number {
    const {
      isJointReturn,
      marginalTaxRate,
      otherDeductions,
      commonChargeDeductionRate,
      taxCutsExpire,
    } = this.values;

    const standardDeduction =
      this.taxParameters.getStandardDeduction(
        actualYear,
        taxCutsExpire,
        isJointReturn
      ) * Math.pow(this.inflationAdjustmentRate, actualYear - this.startYear);

    const annualCommonCharge = this.firstYearCommonCharge * inflationFactor;
    const annualCommonChargeDeduction =
      annualCommonCharge * commonChargeDeductionRate;
    const SALTcap = this.taxParameters.getSALTcap(actualYear, taxCutsExpire);
    const annualPropertyTax = currentYearPrice * this.propertyTaxRate;
    const combinedDeductions = annualPropertyTax + annualCommonChargeDeduction;
    const cappedDeductions = Math.min(combinedDeductions, SALTcap);
    const adjustedOtherDeductions = otherDeductions * inflationFactor;
    const nonHouseDeductions = Math.max(
      adjustedOtherDeductions,
      standardDeduction
    );
    const totalHouseDeductions =
      annualDeductibleInterest + cappedDeductions + adjustedOtherDeductions;
    const deductionBenefit =
      Math.max(0, totalHouseDeductions - nonHouseDeductions) * marginalTaxRate;

    return deductionBenefit;
  }

  private opportunityCost(cumulativeOpportunityCost: number): number {
    return (
      this.initialCosts * this.initialOpportunityAdjustment +
      cumulativeOpportunityCost
    );
  }

  private closingCosts(currentYearPrice: number): number {
    return currentYearPrice * this.values.sellingCosts;
  }

  private sellTaxes(currentYearPrice: number): number {
    const gain =
      currentYearPrice - this.values.homePrice - this.CAPITAL_GAINS_EXCLUSION;
    return Math.max(0, gain) * this.CAPITAL_GAINS_TAX_RATE;
  }

  private totalSaleCosts(
    remainingLoanPrincipal: number,
    currentYearPrice: number
  ): number {
    return (
      this.closingCosts(currentYearPrice) +
      this.sellTaxes(currentYearPrice) +
      remainingLoanPrincipal -
      currentYearPrice
    );
  }

  private totalCost(
    totalYearCost: number,
    cumulativeOpportunityCost: number,
    remainingLoanPrincipal: number,
    currentYearPrice: number
  ): number {
    return (
      this.initialCosts +
      totalYearCost +
      this.opportunityCost(cumulativeOpportunityCost) +
      this.totalSaleCosts(remainingLoanPrincipal, currentYearPrice)
    );
  }

  // --- Public API ---
  getTotalCost(values?: CalculatorValues): number {
    if (values) {
      this.values = values;
      this._recurringCosts = null;
    }
    const {
      totalYearCost,
      opportunityCost: oppCost,
      remainingLoanPrincipal,
      currentYearPrice,
    } = this.calculateRecurringCosts();
    return this.totalCost(
      totalYearCost,
      oppCost,
      remainingLoanPrincipal,
      currentYearPrice
    );
  }

  calculate(values?: CalculatorValues) {
    if (values) {
      this.values = values;
      this._recurringCosts = null;
    }
    const recurring = this.calculateRecurringCosts();

    return {
      downPayment: this.downPaymentAmount,
      closingCost: this.closingCost,
      initialCost: this.initialCosts,
      totalCost: this.totalCost(
        recurring.totalYearCost,
        recurring.opportunityCost,
        recurring.remainingLoanPrincipal,
        recurring.currentYearPrice
      ),
      opportunityCost: this.opportunityCost(recurring.opportunityCost),
      recurringCost: recurring.totalYearCost,
      netProceeds: this.totalSaleCosts(
        recurring.remainingLoanPrincipal,
        recurring.currentYearPrice
      ),
      yearlyBreakdown: recurring.yearlyBreakdown,
    };
  }
}
