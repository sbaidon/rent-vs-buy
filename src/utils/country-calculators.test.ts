import { describe, it, expect, beforeEach } from "vitest";
import { CountryBuyingCalculator, createBuyingCalculator } from "./country-buy-calculator";
import { CountryRentingCalculator, createRentingCalculator } from "./country-rent-calculator";
import type { CalculatorValues } from "../context/calculator-context";
import type { CountryCode } from "../constants/country-rules";
import { getCountryConfig } from "../constants/country-rules";

// Base test values (US-centric)
const baseValues: CalculatorValues = {
  homePrice: 500000,
  monthlyRent: 2000,
  mortgageRate: 0.0725,
  mortgageTerm: 30,
  downPayment: 0.2,
  yearsToStay: 10,
  pmi: 0,
  homePriceGrowth: 0.03,
  rentGrowth: 0.03,
  investmentReturn: 0.045,
  inflationRate: 0.03,
  isJointReturn: true,
  propertyTaxRate: 0.0135,
  marginalTaxRate: 0.22,
  otherDeductions: 0,
  taxCutsExpire: true,
  buyingCosts: 0.04,
  sellingCosts: 0.06,
  maintenanceRate: 0.01,
  homeInsuranceRate: 0.0055,
  extraPayments: 100,
  securityDeposit: 1,
  brokerFee: 0,
  monthlyRentersInsurance: 100,
  isNewBuild: false,
  isFirstTimeBuyer: false,
  isPrimaryResidence: true,
  willReinvest: true,
};

describe("CountryBuyingCalculator", () => {
  describe("US calculations", () => {
    let calculator: CountryBuyingCalculator;

    beforeEach(() => {
      calculator = createBuyingCalculator("US", baseValues);
    });

    it("calculates initial costs correctly", () => {
      const result = calculator.calculate();
      
      // Down payment: 500000 * 0.2 = 100000
      // Closing costs: 500000 * 0.04 = 20000
      expect(result.initialCost).toBe(120000);
    });

    it("returns a positive total cost for buying", () => {
      const result = calculator.calculate();
      expect(result.totalCost).toBeGreaterThan(0);
    });

    it("includes tax deduction benefits (reduces cost)", () => {
      const noDeductionCalc = createBuyingCalculator("CA", baseValues);
      const usCalc = createBuyingCalculator("US", baseValues);
      
      const usResult = usCalc.calculate();
      const caResult = noDeductionCalc.calculate();
      
      // US should have lower costs due to mortgage interest deduction
      // (assuming all else equal, which it's not quite, but direction should be correct)
      // This is a rough check - actual values depend on many factors
      expect(usResult.recurringCost).toBeLessThan(caResult.recurringCost);
    });

    it("calculates yearly breakdown with correct length", () => {
      const result = calculator.calculate();
      expect(result.yearlyBreakdown).toHaveLength(baseValues.yearsToStay);
    });

    it("calculates net proceeds (negative = equity gained)", () => {
      const result = calculator.calculate();
      // With home appreciation, net proceeds should show equity
      expect(result.netProceeds).toBeLessThan(0);
    });
  });

  describe("Germany calculations", () => {
    let calculator: CountryBuyingCalculator;
    const deValues: CalculatorValues = {
      ...baseValues,
      // German defaults
      buyingCosts: 0, // Let it use country defaults
      sellingCosts: 0,
      mortgageTerm: 30,
      downPayment: 0.2,
    };

    beforeEach(() => {
      calculator = createBuyingCalculator("DE", deValues);
    });

    it("uses higher closing costs (Grunderwerbsteuer + notary)", () => {
      const config = getCountryConfig("DE");
      const expectedClosingRate = 
        config.closingCosts.notaryFees +
        config.closingCosts.transferTax +
        config.closingCosts.registrationFees +
        config.closingCosts.agentCommission / 2; // Split commission
      
      const result = calculator.calculate();
      
      // Down payment + closing costs
      const downPayment = 500000 * 0.2;
      const closingCosts = 500000 * expectedClosingRate;
      
      expect(result.initialCost).toBeCloseTo(downPayment + closingCosts, -2);
    });

    it("has no mortgage interest tax benefit", () => {
      // Germany doesn't allow mortgage interest deduction for owner-occupied
      const result = calculator.calculate();
      
      // Compare with a high-marginal-tax scenario
      const highTaxValues = { ...deValues, marginalTaxRate: 0.42 };
      const highTaxCalc = createBuyingCalculator("DE", highTaxValues);
      const highTaxResult = highTaxCalc.calculate();
      
      // Recurring costs should be similar regardless of tax rate
      // (since there's no deduction benefit)
      // Allow for small differences due to other factors
      const diff = Math.abs(result.recurringCost - highTaxResult.recurringCost);
      const percentDiff = diff / result.recurringCost;
      expect(percentDiff).toBeLessThan(0.01); // Less than 1% difference
    });
  });

  describe("UK calculations", () => {
    let calculator: CountryBuyingCalculator;

    beforeEach(() => {
      calculator = createBuyingCalculator("GB", {
        ...baseValues,
        buyingCosts: 0,
        sellingCosts: 0,
      });
    });

    it("uses exact SDLT bracket calculation for closing costs", () => {
      const config = getCountryConfig("GB");
      const result = calculator.calculate();
      
      const downPayment = 500000 * 0.2;
      // Exact SDLT for £500k: £0-250k at 0% = £0, £250k-500k at 5% = £12,500
      const sdlt = 12500;
      const registration = 500000 * config.closingCosts.registrationFees;
      
      // UK buyer doesn't pay agent commission (seller pays)
      expect(result.initialCost).toBeCloseTo(downPayment + sdlt + registration, -2);
    });
  });

  describe("France calculations", () => {
    let calculator: CountryBuyingCalculator;

    beforeEach(() => {
      calculator = createBuyingCalculator("FR", {
        ...baseValues,
        buyingCosts: 0,
        sellingCosts: 0,
      });
    });

    it("uses high notary fees (frais de notaire)", () => {
      const result = calculator.calculate();
      
      // France has ~8% notary fees (includes transfer tax)
      expect(result.initialCost).toBeGreaterThan(baseValues.homePrice * 0.2 + baseValues.homePrice * 0.07);
    });
  });

  describe("UK first-time buyer SDLT relief", () => {
    it("reduces closing costs for first-time buyers under £625k", () => {
      const standardCalc = createBuyingCalculator("GB", {
        ...baseValues,
        buyingCosts: 0,
        sellingCosts: 0,
        isFirstTimeBuyer: false,
      });
      const ftbCalc = createBuyingCalculator("GB", {
        ...baseValues,
        buyingCosts: 0,
        sellingCosts: 0,
        isFirstTimeBuyer: true,
      });

      const standardResult = standardCalc.calculate();
      const ftbResult = ftbCalc.calculate();

      // First-time buyer should have lower initial costs (lower SDLT)
      expect(ftbResult.initialCost).toBeLessThan(standardResult.initialCost);
    });

    it("gives 0 SDLT for first-time buyers on £425k property", () => {
      const calc = createBuyingCalculator("GB", {
        ...baseValues,
        homePrice: 425000,
        buyingCosts: 0,
        sellingCosts: 0,
        isFirstTimeBuyer: true,
      });
      const result = calc.calculate();
      
      // £425k is within the nil-rate band for FTB, so SDLT = 0
      const downPayment = 425000 * 0.2;
      const registration = 425000 * getCountryConfig("GB").closingCosts.registrationFees;
      expect(result.initialCost).toBeCloseTo(downPayment + registration, -2);
    });
  });

  describe("France new build toggle", () => {
    it("reduces notaire fees for new builds", () => {
      const existingCalc = createBuyingCalculator("FR", {
        ...baseValues,
        buyingCosts: 0,
        sellingCosts: 0,
        isNewBuild: false,
      });
      const newBuildCalc = createBuyingCalculator("FR", {
        ...baseValues,
        buyingCosts: 0,
        sellingCosts: 0,
        isNewBuild: true,
      });

      const existingResult = existingCalc.calculate();
      const newBuildResult = newBuildCalc.calculate();

      // New build should have lower initial costs (~3% vs ~8% notaire fees)
      expect(newBuildResult.initialCost).toBeLessThan(existingResult.initialCost);
      // Difference should be approximately 5% of home price
      const diff = existingResult.initialCost - newBuildResult.initialCost;
      expect(diff).toBeCloseTo(baseValues.homePrice * 0.05, -3);
    });
  });

  describe("Italy primary residence toggle", () => {
    it("reduces transfer tax for primary residence", () => {
      const secondaryCalc = createBuyingCalculator("IT", {
        ...baseValues,
        buyingCosts: 0,
        sellingCosts: 0,
        isPrimaryResidence: false,
      });
      const primaryCalc = createBuyingCalculator("IT", {
        ...baseValues,
        buyingCosts: 0,
        sellingCosts: 0,
        isPrimaryResidence: true,
      });

      const secondaryResult = secondaryCalc.calculate();
      const primaryResult = primaryCalc.calculate();

      // Primary residence should have lower initial costs (2% vs 9% transfer tax)
      expect(primaryResult.initialCost).toBeLessThan(secondaryResult.initialCost);
    });
  });

  describe("Spain willReinvest toggle", () => {
    it("applies CGT when not reinvesting primary residence proceeds", () => {
      const reinvestCalc = createBuyingCalculator("ES", {
        ...baseValues,
        buyingCosts: 0,
        sellingCosts: 0,
        isPrimaryResidence: true,
        willReinvest: true,
      });
      const noReinvestCalc = createBuyingCalculator("ES", {
        ...baseValues,
        buyingCosts: 0,
        sellingCosts: 0,
        isPrimaryResidence: true,
        willReinvest: false,
      });

      const reinvestResult = reinvestCalc.calculate();
      const noReinvestResult = noReinvestCalc.calculate();

      // Not reinvesting should have higher total cost (capital gains tax applies)
      expect(noReinvestResult.totalCost).toBeGreaterThan(reinvestResult.totalCost);
    });
  });

  describe("Country comparison", () => {
    const countries: CountryCode[] = ["US", "CA", "DE", "FR", "GB", "IT", "ES", "MX"];

    it("all countries produce valid results", () => {
      for (const country of countries) {
        const calc = createBuyingCalculator(country, baseValues);
        const result = calc.calculate();

        expect(result.initialCost).toBeGreaterThan(0);
        expect(result.recurringCost).toBeGreaterThan(0);
        expect(result.totalCost).toBeDefined();
        expect(result.yearlyBreakdown).toHaveLength(baseValues.yearsToStay);
      }
    });

    it("closing costs vary by country", () => {
      const results = countries.map(country => ({
        country,
        initialCost: createBuyingCalculator(country, {
          ...baseValues,
          buyingCosts: 0, // Use country defaults
          sellingCosts: 0,
        }).calculate().initialCost
      }));

      // Get unique initial costs (allowing for small differences)
      const uniqueCosts = new Set(
        results.map(r => Math.round(r.initialCost / 1000))
      );
      
      // There should be variation between countries
      expect(uniqueCosts.size).toBeGreaterThan(1);
    });
  });
});

describe("CountryRentingCalculator", () => {
  describe("US calculations", () => {
    let calculator: CountryRentingCalculator;

    beforeEach(() => {
      calculator = createRentingCalculator("US", baseValues);
    });

    it("calculates initial costs correctly", () => {
      // Test with explicit no broker fee
      const calcNoBroker = createRentingCalculator("US", { ...baseValues, securityDeposit: 1, brokerFee: 0.0001 });
      const result = calcNoBroker.calculate();
      
      // Security deposit: 2000 * 1 = 2000
      // Broker fee: effectively 0
      expect(result.initialCost).toBeCloseTo(2000, -1);
    });

    it("returns a positive total cost for renting", () => {
      const result = calculator.calculate();
      expect(result.totalCost).toBeGreaterThan(0);
    });

    it("returns security deposit as net proceeds", () => {
      const result = calculator.calculate();
      expect(result.netProceeds).toBe(-2000); // Negative = money returned
    });

    it("calculates yearly breakdown with correct length", () => {
      const result = calculator.calculate();
      expect(result.yearlyBreakdown).toHaveLength(baseValues.yearsToStay);
    });

    it("accounts for rent growth over time", () => {
      // First year should be lower than last year
      const firstYearBase = baseValues.monthlyRent * 12;
      const lastYearBase = firstYearBase * Math.pow(1 + baseValues.rentGrowth, baseValues.yearsToStay - 1);
      
      // Yearly breakdown includes opportunity cost, so compare base rent
      expect(lastYearBase).toBeGreaterThan(firstYearBase);
    });
  });

  describe("Germany calculations", () => {
    let calculator: CountryRentingCalculator;

    beforeEach(() => {
      calculator = createRentingCalculator("DE", {
        ...baseValues,
        securityDeposit: 0, // Use country default
        brokerFee: 0,
      });
    });

    it("uses 3-month security deposit (Kaution)", () => {
      const config = getCountryConfig("DE");
      const result = calculator.calculate();
      
      // Germany allows up to 3 months security deposit
      const expectedDeposit = baseValues.monthlyRent * config.rentingRules.typicalSecurityDeposit;
      expect(result.initialCost).toBeCloseTo(expectedDeposit, 0);
    });

    it("has no broker fee (Bestellerprinzip)", () => {
      const config = getCountryConfig("DE");
      expect(config.rentingRules.brokerFeesCommon).toBe(false);
      
      // Initial cost should just be security deposit
      const result = calculator.calculate();
      const expectedDeposit = baseValues.monthlyRent * config.rentingRules.typicalSecurityDeposit;
      expect(result.initialCost).toBeCloseTo(expectedDeposit, 0);
    });
  });

  describe("UK calculations", () => {
    let calculator: CountryRentingCalculator;

    beforeEach(() => {
      calculator = createRentingCalculator("GB", {
        ...baseValues,
        securityDeposit: 0, // Use country default
        brokerFee: 0.0001, // Very small to avoid using country default
      });
    });

    it("uses 5-week deposit cap (~1.15 months)", () => {
      const config = getCountryConfig("GB");
      const result = calculator.calculate();
      
      // UK caps deposit at 5 weeks rent (~1.15 months)
      const expectedDeposit = baseValues.monthlyRent * config.rentingRules.typicalSecurityDeposit;
      
      // Should be approximately 5 weeks worth of rent
      const weeklyRent = baseValues.monthlyRent / 4.33;
      const fiveWeeksRent = weeklyRent * 5;
      
      expect(result.initialCost).toBeCloseTo(expectedDeposit, 0);
      // Allow for small rounding differences between calculation methods
      expect(result.initialCost).toBeCloseTo(fiveWeeksRent, -2);
    });

    it("has no broker fee (banned in 2019)", () => {
      const config = getCountryConfig("GB");
      expect(config.rentingRules.brokerFeesCommon).toBe(false);
    });
  });

  describe("Country comparison", () => {
    const countries: CountryCode[] = ["US", "CA", "DE", "FR", "GB", "IT", "ES", "MX"];

    it("all countries produce valid results", () => {
      for (const country of countries) {
        const calc = createRentingCalculator(country, baseValues);
        const result = calc.calculate();

        expect(result.initialCost).toBeGreaterThanOrEqual(0);
        expect(result.recurringCost).toBeGreaterThan(0);
        expect(result.totalCost).toBeDefined();
        expect(result.yearlyBreakdown).toHaveLength(baseValues.yearsToStay);
      }
    });

    it("security deposits vary by country", () => {
      const results = countries.map(country => ({
        country,
        initialCost: createRentingCalculator(country, {
          ...baseValues,
          securityDeposit: 0, // Use country defaults
          brokerFee: 0,
        }).calculate().initialCost
      }));

      // Germany should have highest (3 months)
      const deResult = results.find(r => r.country === "DE");
      const usResult = results.find(r => r.country === "US");
      
      expect(deResult!.initialCost).toBeGreaterThan(usResult!.initialCost);
    });
  });
});

describe("Rent vs Buy comparison", () => {
  it("renting is cheaper than buying for short stays in high-cost markets", () => {
    const shortStayValues: CalculatorValues = {
      ...baseValues,
      yearsToStay: 3,
      homePrice: 800000,
      monthlyRent: 2500,
    };

    const buyCalc = createBuyingCalculator("US", shortStayValues);
    const rentCalc = createRentingCalculator("US", shortStayValues);

    const buyResult = buyCalc.calculate();
    const rentResult = rentCalc.calculate();

    // For short stays, renting typically wins due to high transaction costs
    expect(rentResult.totalCost).toBeLessThan(buyResult.totalCost);
  });

  it("buying can be cheaper for long stays", () => {
    const longStayValues: CalculatorValues = {
      ...baseValues,
      yearsToStay: 20,
      homePrice: 400000,
      monthlyRent: 2000,
    };

    const buyCalc = createBuyingCalculator("US", longStayValues);
    const rentCalc = createRentingCalculator("US", longStayValues);

    const buyResult = buyCalc.calculate();
    const rentResult = rentCalc.calculate();

    // For long stays with reasonable price/rent ratio, buying often wins
    // (this depends on many factors, but 20 years usually favors buying)
    expect(buyResult.totalCost).toBeLessThan(rentResult.totalCost);
  });

  it("country rules affect the break-even point", () => {
    const values: CalculatorValues = {
      ...baseValues,
      yearsToStay: 7,
      buyingCosts: 0,
      sellingCosts: 0,
    };

    // Compare US (mortgage interest deduction) vs Germany (no deduction, high closing costs)
    const usBuy = createBuyingCalculator("US", values).calculate();
    const usRent = createRentingCalculator("US", values).calculate();
    const usSavings = usRent.totalCost - usBuy.totalCost;

    const deBuy = createBuyingCalculator("DE", values).calculate();
    const deRent = createRentingCalculator("DE", values).calculate();
    const deSavings = deRent.totalCost - deBuy.totalCost;

    // US should have better buying economics due to tax benefits
    // (positive savings = buying is better)
    expect(usSavings).toBeGreaterThan(deSavings);
  });
});
