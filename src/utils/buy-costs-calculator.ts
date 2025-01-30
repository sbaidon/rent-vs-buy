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

export class BuyingCostsCalculator implements Calculator {
  private readonly CAPITAL_GAINS_TAX_RATE = 0.15;
  private readonly CAPITAL_GAINS_EXCLUSION = 500_000;
  private readonly taxParameters = new TaxesCalculator();

  private _recurringCosts: {
    buyYearlyOpportunityCost: number;
    yearlyCurrentPrice: number;
    buyTotalYearCost: number;
    buyLoanPrincipal: number;
    buyLoanPaymentToPrincipal: number;
    buyLoanPaymentToInterest: number;
    buyPaymentToPMI: number;
    buyCommonCharges: number;
    buyPropertyTaxes: number;
    buyUtilitiesCost: number;
    buyMaintenanceCost: number;
    buyInsuranceCost: number;
  } | null = null;

  constructor(private values: CalculatorValues) {}

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

  private get buyYearPriceRate(): number {
    return 1 + this.values.homePriceGrowth;
  }

  private get initialBuyLoanMonths(): number {
    return this.values.mortgageTerm * 12;
  }

  private get buyMonthlyLoanRate(): number {
    return this.values.mortgageRate / 12;
  }

  private get actualPropertyTaxRate(): number {
    return this.values.propertyTaxRate;
  }

  private get maintenanceCostFirstYear(): number {
    return this.values.homePrice * this.values.maintenanceRate;
  }

  private get downPayment(): number {
    return this.values.downPayment * this.values.homePrice;
  }

  private get extraPaymentsYear(): number {
    return this.values.extraPayments * 12;
  }

  private get initialLoanPrincipal(): number {
    return this.values.homePrice - this.downPayment;
  }

  private get buyLoanPaymentPerMonth(): number {
    const r = this.buyMonthlyLoanRate;
    const n = this.initialBuyLoanMonths;
    if (r === 0) {
      return this.initialLoanPrincipal / n;
    }
    // Standard annuity formula
    return this.initialLoanPrincipal * (r / (1 - Math.pow(1 + r, -n)));
  }

  private get commonChargeFirstYear(): number {
    // Multiplying by 12 up front to get annual cost
    // Then applying (1 - marginalTax * deductionRate)
    return (
      this.values.commonChargePerMonth *
      12 *
      (1 - this.values.marginalTaxRate * this.values.commonChargeDeductionRate)
    );
  }

  private get closingCost(): number {
    return this.values.homePrice * this.values.buyingCosts;
  }

  private get totalPurchaseCost(): number {
    return this.downPayment + this.closingCost;
  }

  private calculateRecurringCosts() {
    if (this._recurringCosts) {
      return this._recurringCosts; // Already computed; skip the loop
    }

    const { homePrice, pmi, homeInsuranceRate, yearsToStay } = this.values;

    let buyYearlyOpportunityCost = 0;
    let buyLoanPaymentToPrincipal = 0;
    let buyLoanPaymentToInterest = 0;
    let buyPaymentToPMI = 0;
    let buyPropertyTaxes = 0;
    let buyCommonCharges = 0;
    let buyUtilitiesCost = 0;
    let buyMaintenanceCost = 0;
    let buyInsuranceCost = 0;
    let yearlyCurrentPrice = 0;
    let buyTotalYearCost = 0;
    let buyTotalSavingsFromDeductions = 0;

    let buyLoanMonths = this.initialBuyLoanMonths;
    let buyLoanPrincipal = this.initialLoanPrincipal;

    for (let year = 1; year <= yearsToStay; ++year) {
      const actualYear = this.startYear + year - 1;

      // For inflation
      const inflationAdjustment = Math.pow(
        this.inflationAdjustmentRate,
        year - 1
      );

      // For amortization limits
      const loanCap = this.taxParameters.getLoanCap(
        actualYear,
        this.values.taxCutsExpire,
        this.values.isJointReturn
      );

      // The property price for this year
      yearlyCurrentPrice = homePrice * Math.pow(this.buyYearPriceRate, year);

      // Opportunity cost from the capital you’re sinking into the property
      // This logic is somewhat subjective, but we'll keep your approach:
      // add returns to the "accumulated" opportunity cost + cost so far
      buyYearlyOpportunityCost +=
        (buyYearlyOpportunityCost + buyTotalYearCost) *
        this.effectiveReturnRate;

      // Amortization for this year
      if (buyLoanMonths > 0) {
        const buyYearLoanMonths = Math.min(buyLoanMonths, 12);
        const yearRateFactor = Math.pow(
          1 + this.buyMonthlyLoanRate,
          buyYearLoanMonths
        );

        // How much interest is actually deductible depends on the loanCap
        const buyPrincipalFractionDeductible = loanCap / buyLoanPrincipal;

        const totalYearlyPayments =
          this.buyLoanPaymentPerMonth * buyYearLoanMonths;
        const newLoanBalance =
          buyLoanPrincipal * yearRateFactor - totalYearlyPayments;

        // Principal paid is the difference between old and new
        const buyYearLoanPaymentToPrincipal = buyLoanPrincipal - newLoanBalance;
        buyLoanPrincipal = newLoanBalance;

        const buyYearLoanPaymentToInterest =
          totalYearlyPayments - buyYearLoanPaymentToPrincipal;

        // Accumulate interest part
        buyLoanPaymentToInterest += buyYearLoanPaymentToInterest;

        // Deductible portion is limited by the fraction that’s under the loanCap
        const buyAnnualDeductiblePaymentToInterest =
          buyPrincipalFractionDeductible < 1
            ? buyYearLoanPaymentToInterest * buyPrincipalFractionDeductible
            : buyYearLoanPaymentToInterest;

        // Accumulate principal part
        buyLoanPaymentToPrincipal += buyYearLoanPaymentToPrincipal;
        buyLoanMonths -= buyYearLoanMonths;

        // PMI if principal is above 80% LTV
        if (pmi !== 0 && buyLoanPrincipal / homePrice > 0.8) {
          buyPaymentToPMI += buyLoanPrincipal * pmi;
        }

        // Sum up the tax deduction savings for the year
        buyTotalSavingsFromDeductions += this.taxDeductions(
          yearlyCurrentPrice,
          actualYear,
          inflationAdjustment,
          buyAnnualDeductiblePaymentToInterest
        );
      }

      // Annual common charges, property taxes, etc.
      buyCommonCharges += this.commonChargeFirstYear * inflationAdjustment;
      buyPropertyTaxes += yearlyCurrentPrice * this.actualPropertyTaxRate;
      buyUtilitiesCost += this.extraPaymentsYear * inflationAdjustment;
      buyMaintenanceCost += this.maintenanceCostFirstYear * inflationAdjustment;
      buyInsuranceCost += yearlyCurrentPrice * homeInsuranceRate;

      // For each year, the total cost so far (excluding sale, which is separate)
      buyTotalYearCost =
        buyLoanPaymentToPrincipal +
        buyLoanPaymentToInterest +
        buyCommonCharges +
        buyPropertyTaxes +
        buyUtilitiesCost +
        buyMaintenanceCost +
        buyInsuranceCost +
        buyPaymentToPMI -
        buyTotalSavingsFromDeductions;
    }

    // Store results so subsequent accesses don’t recompute the entire loop
    this._recurringCosts = {
      buyYearlyOpportunityCost,
      yearlyCurrentPrice,
      buyTotalYearCost,
      buyLoanPrincipal,
      buyLoanPaymentToPrincipal,
      buyLoanPaymentToInterest,
      buyPaymentToPMI,
      buyCommonCharges,
      buyPropertyTaxes,
      buyUtilitiesCost,
      buyMaintenanceCost,
      buyInsuranceCost,
    };

    return this._recurringCosts;
  }

  /**
   * Helper that calculates how much you save from itemized deductions
   * above the standard deduction, only if it surpasses the standard deduction.
   */
  private taxDeductions(
    yearlyCurrentPrice: number,
    actualYear: number,
    inflationAdjustment: number,
    annualDeductiblePaymentToInterest: number
  ): number {
    const {
      isJointReturn,
      marginalTaxRate,
      otherDeductions,
      commonChargeDeductionRate,
      taxCutsExpire,
    } = this.values;

    // Standard deduction, inflation adjusted
    const standardDeduction =
      this.taxParameters.getStandardDeduction(
        actualYear,
        taxCutsExpire,
        isJointReturn
      ) * Math.pow(this.inflationAdjustmentRate, actualYear - this.startYear);

    // Common charges for the year, scaled
    const buyCommonChargeThisYear =
      this.commonChargeFirstYear * inflationAdjustment;
    const buyAnnualCommonChargeDeduction =
      buyCommonChargeThisYear * commonChargeDeductionRate;

    // Cap on SALT
    const SALTcap = this.taxParameters.getSALTcap(actualYear, taxCutsExpire);

    // Property tax + deducible portion of common charges
    const buyAnnualPropertyTaxDeduction =
      yearlyCurrentPrice * this.actualPropertyTaxRate;
    const buyAnnualPropTaxAndCommon =
      buyAnnualPropertyTaxDeduction + buyAnnualCommonChargeDeduction;

    const cappedPropTaxAndCommon = Math.min(buyAnnualPropTaxAndCommon, SALTcap);
    const buyOtherItemizationsAdjusted = otherDeductions * inflationAdjustment;

    // If you itemize, you get the larger of standard deduction or your “other” itemizations
    const nonHouseDeductions = Math.max(
      buyOtherItemizationsAdjusted,
      standardDeduction
    );

    // Combined total house-related itemized expenses
    const buyTotalAnnualHouseDeductible =
      annualDeductiblePaymentToInterest +
      cappedPropTaxAndCommon +
      buyOtherItemizationsAdjusted;

    // The marginal benefit from itemizing house deductions vs. not
    const buyRelativeAnnualSavingsFromDeductions =
      Math.max(0, buyTotalAnnualHouseDeductible - nonHouseDeductions) *
      marginalTaxRate;

    return buyRelativeAnnualSavingsFromDeductions;
  }

  // Opportunity cost is the forgone return on your total initial outlay plus
  // the incremental cost each year, which you treat as if it could've earned returns.
  private get opportunityCost(): number {
    const { buyYearlyOpportunityCost } = this.calculateRecurringCosts();
    return (
      this.totalPurchaseCost * this.initialOpportunityAdjustment +
      buyYearlyOpportunityCost
    );
  }

  private get closingCosts(): number {
    // Selling costs based on final property price
    const { yearlyCurrentPrice } = this.calculateRecurringCosts();
    return yearlyCurrentPrice * this.values.sellingCosts;
  }

  private get sellTaxes(): number {
    // Capital gains tax if sale price - purchase price > exclusion
    const { yearlyCurrentPrice } = this.calculateRecurringCosts();
    const gain =
      yearlyCurrentPrice - this.values.homePrice - this.CAPITAL_GAINS_EXCLUSION;
    return Math.max(0, gain) * this.CAPITAL_GAINS_TAX_RATE;
  }

  private totalSaleCosts(buyLoanPrincipal: number): number {
    const { yearlyCurrentPrice } = this.calculateRecurringCosts();
    return (
      this.closingCosts + this.sellTaxes + buyLoanPrincipal - yearlyCurrentPrice
    );
  }

  // Down payment + buyer closing costs
  private get initialCosts(): number {
    return this.downPayment + this.closingCost;
  }

  private totalCost(buyLoanPrincipal: number): number {
    const {
      buyTotalYearCost, // all years' total cost
    } = this.calculateRecurringCosts();
    return (
      this.totalPurchaseCost +
      buyTotalYearCost +
      this.opportunityCost +
      this.totalSaleCosts(buyLoanPrincipal)
    );
  }

  /**
   * Public API:
   * 1. getTotalCost()
   * 2. calculate() returns a breakdown of all major cost components
   */
  getTotalCost(values?: CalculatorValues): number {
    if (values) {
      this.values = values;
      this._recurringCosts = null;
    }
    const { buyLoanPrincipal } = this.calculateRecurringCosts();
    return this.totalCost(buyLoanPrincipal);
  }

  calculate(values?: CalculatorValues) {
    if (values) {
      this.values = values;
      this._recurringCosts = null;
    }
    const rc = this.calculateRecurringCosts();
    return {
      downPayment: this.downPayment,
      closingCost: this.closingCost,
      initialCost: this.initialCosts,
      totalCost: this.totalCost(rc.buyLoanPrincipal),
      opportunityCost: this.opportunityCost,
      recurringCost: rc.buyTotalYearCost,
      netProceeds: this.totalSaleCosts(rc.buyLoanPrincipal), // how much is left after all sale costs & mortgage payoff
    };
  }
}
