import { describe, it, expect } from "vitest";
import {
  USTaxCalculator,
  UKTaxCalculator,
  GermanyTaxCalculator,
  FranceTaxCalculator,
  CanadaTaxCalculator,
  SpainTaxCalculator,
  ItalyTaxCalculator,
  MexicoTaxCalculator,
  getTaxCalculator,
  type TaxCalculationParams,
} from "./index";

describe("USTaxCalculator", () => {
  const calculator = new USTaxCalculator();

  describe("getStandardDeduction", () => {
    it("returns TCJA deduction for years before 2026", () => {
      expect(calculator.getStandardDeduction(2024, false)).toBe(14600); // Single
      expect(calculator.getStandardDeduction(2024, true)).toBe(29200); // Joint
      expect(calculator.getStandardDeduction(2025, false)).toBe(14600);
      expect(calculator.getStandardDeduction(2025, true)).toBe(29200);
    });

    it("returns pre-TCJA deduction for years after 2025 when taxCutsExpire", () => {
      expect(calculator.getStandardDeduction(2026, false, true)).toBe(8126); // Single
      expect(calculator.getStandardDeduction(2026, true, true)).toBe(16253); // Joint
    });

    it("returns TCJA deduction for years after 2025 when taxCutsExpire is false", () => {
      expect(calculator.getStandardDeduction(2026, false, false)).toBe(14600);
      expect(calculator.getStandardDeduction(2026, true, false)).toBe(29200);
    });
  });

  describe("getLoanCap", () => {
    it("returns TCJA loan cap for years before 2026", () => {
      expect(calculator.getLoanCap(2024, false)).toBe(375000); // Single
      expect(calculator.getLoanCap(2024, true)).toBe(750000); // Joint
    });

    it("returns pre-TCJA loan cap for years after 2025 when taxCutsExpire", () => {
      expect(calculator.getLoanCap(2026, false, true)).toBe(500000); // Single
      expect(calculator.getLoanCap(2026, true, true)).toBe(1000000); // Joint
    });
  });

  describe("calculateDeductionBenefits", () => {
    const baseParams: TaxCalculationParams = {
      year: 2024,
      homePrice: 500000,
      currentHomeValue: 515000,
      loanBalance: 400000,
      interestPaid: 25000,
      propertyTaxPaid: 6750,
      isJointReturn: true,
      marginalTaxRate: 0.22,
      otherDeductions: 5000,
      yearsOwned: 1,
      taxCutsExpire: true,
    };

    it("calculates deductible interest when loan is under cap", () => {
      const result = calculator.calculateDeductionBenefits(baseParams);
      
      expect(result.deductibleInterest).toBe(25000);
      expect(result.deductiblePropertyTax).toBe(6750); // Under SALT cap
    });

    it("prorates interest deduction when loan exceeds cap", () => {
      const params = { ...baseParams, loanBalance: 1000000 };
      const result = calculator.calculateDeductionBenefits(params);
      
      // Loan cap is 750000 for joint, so 75% of interest is deductible
      expect(result.deductibleInterest).toBe(25000 * 0.75);
    });

    it("caps property tax at SALT limit", () => {
      const params = { ...baseParams, propertyTaxPaid: 15000 };
      const result = calculator.calculateDeductionBenefits(params);
      
      expect(result.deductiblePropertyTax).toBe(10000); // SALT cap
    });

    it("calculates tax savings from deductions", () => {
      const result = calculator.calculateDeductionBenefits(baseParams);
      
      // Total itemized: 25000 + 6750 + 5000 = 36750
      // Standard deduction: 29200
      // Other deductions alone: 5000
      // Housing-related excess: max(0, 36750 - max(5000, 29200)) = 36750 - 29200 = 7550
      // Savings: 7550 * 0.22 = 1661
      expect(result.deductionSavings).toBeCloseTo(1661, 0);
    });
  });

  describe("calculateCapitalGainsTax", () => {
    it("applies full exemption for primary residence over 2 years", () => {
      const result = calculator.calculateCapitalGainsTax({
        purchasePrice: 400000,
        salePrice: 600000,
        yearsOwned: 3,
        isJointReturn: true,
        isPrimaryResidence: true,
      });

      expect(result.qualifiesForExemption).toBe(true);
      expect(result.taxableGain).toBe(0); // 200k gain under 500k exclusion
      expect(result.taxAmount).toBe(0);
    });

    it("taxes gains above exemption amount", () => {
      const result = calculator.calculateCapitalGainsTax({
        purchasePrice: 400000,
        salePrice: 1000000,
        yearsOwned: 5,
        isJointReturn: true,
        isPrimaryResidence: true,
      });

      expect(result.qualifiesForExemption).toBe(true);
      expect(result.taxableGain).toBe(100000); // 600k gain - 500k exclusion
      expect(result.taxAmount).toBe(15000); // 100k * 15%
    });

    it("applies lower single filer exemption", () => {
      const result = calculator.calculateCapitalGainsTax({
        purchasePrice: 400000,
        salePrice: 800000,
        yearsOwned: 3,
        isJointReturn: false,
        isPrimaryResidence: true,
      });

      expect(result.taxableGain).toBe(150000); // 400k gain - 250k single exclusion
      expect(result.taxAmount).toBe(22500); // 150k * 15%
    });

    it("does not apply exemption for non-primary residence", () => {
      const result = calculator.calculateCapitalGainsTax({
        purchasePrice: 400000,
        salePrice: 500000,
        yearsOwned: 5,
        isJointReturn: true,
        isPrimaryResidence: false,
      });

      expect(result.qualifiesForExemption).toBe(false);
      expect(result.taxableGain).toBe(100000);
      expect(result.taxAmount).toBe(15000);
    });

    it("does not apply exemption for less than 2 years ownership", () => {
      const result = calculator.calculateCapitalGainsTax({
        purchasePrice: 400000,
        salePrice: 500000,
        yearsOwned: 1,
        isJointReturn: true,
        isPrimaryResidence: true,
      });

      expect(result.qualifiesForExemption).toBe(false);
      expect(result.taxableGain).toBe(100000);
    });
  });
});

// ============================================================================
// United Kingdom
// ============================================================================

describe("UKTaxCalculator", () => {
  const calculator = new UKTaxCalculator();

  it("returns no deduction benefits", () => {
    const result = calculator.calculateDeductionBenefits({
      year: 2024,
      homePrice: 350000,
      currentHomeValue: 360000,
      loanBalance: 280000,
      interestPaid: 12000,
      propertyTaxPaid: 1800,
      isJointReturn: false,
      marginalTaxRate: 0.40,
      otherDeductions: 0,
      yearsOwned: 1,
    });

    expect(result.deductionSavings).toBe(0);
    expect(result.deductibleInterest).toBe(0);
    expect(result.deductiblePropertyTax).toBe(0);
  });

  it("exempts primary residence via PPR relief", () => {
    const result = calculator.calculateCapitalGainsTax({
      purchasePrice: 400000,
      salePrice: 700000,
      yearsOwned: 1,
      isJointReturn: false,
      isPrimaryResidence: true,
    });

    expect(result.qualifiesForExemption).toBe(true);
    expect(result.taxableGain).toBe(0);
    expect(result.taxAmount).toBe(0);
  });

  it("applies CGT annual exempt amount for non-PPR", () => {
    const result = calculator.calculateCapitalGainsTax({
      purchasePrice: 300000,
      salePrice: 310000,
      yearsOwned: 3,
      isJointReturn: false,
      isPrimaryResidence: false,
    });

    // 10k gain - 3k annual exempt = 7k taxable at 24% higher rate
    expect(result.qualifiesForExemption).toBe(false);
    expect(result.taxableGain).toBe(7000);
    expect(result.taxAmount).toBeCloseTo(1680, 0); // 7000 * 0.24
  });

  it("taxes full non-PPR gains above annual exempt amount", () => {
    const result = calculator.calculateCapitalGainsTax({
      purchasePrice: 200000,
      salePrice: 400000,
      yearsOwned: 5,
      isJointReturn: false,
      isPrimaryResidence: false,
    });

    // 200k gain - 3k exempt = 197k taxable
    expect(result.taxableGain).toBe(197000);
    expect(result.taxAmount).toBeCloseTo(47280, 0); // 197000 * 0.24
  });

  describe("SDLT calculation", () => {
    it("charges 0% on properties up to £250k", () => {
      expect(calculator.calculateSDLT(250000)).toBe(0);
    });

    it("calculates SDLT correctly for £350k property", () => {
      // First 250k: 0%, next 100k: 5% = 5000
      expect(calculator.calculateSDLT(350000)).toBe(5000);
    });

    it("calculates SDLT correctly for £1M property", () => {
      // 0-250k: 0, 250k-925k: 675k * 5% = 33,750, 925k-1M: 75k * 10% = 7,500
      expect(calculator.calculateSDLT(1000000)).toBe(41250);
    });

    it("calculates SDLT correctly for £2M property", () => {
      // 0-250k: 0, 250k-925k: 33,750, 925k-1.5M: 57,500, 1.5M-2M: 500k * 12% = 60,000
      expect(calculator.calculateSDLT(2000000)).toBe(151250);
    });

    it("gives 0 SDLT for first-time buyers up to £425k", () => {
      expect(calculator.calculateSDLT(425000, true)).toBe(0);
      expect(calculator.calculateSDLT(300000, true)).toBe(0);
    });

    it("charges 5% above £425k for first-time buyers up to £625k", () => {
      // £500k FTB: £0-425k at 0%, £425k-500k at 5% = £3,750
      expect(calculator.calculateSDLT(500000, true)).toBe(3750);
      // £625k FTB: £0-425k at 0%, £425k-625k at 5% = £10,000
      expect(calculator.calculateSDLT(625000, true)).toBe(10000);
    });

    it("uses standard brackets when FTB property exceeds £625k", () => {
      // Properties over £625k don't qualify for FTB relief
      expect(calculator.calculateSDLT(700000, true)).toBe(calculator.calculateSDLT(700000, false));
    });
  });

  it("returns personal allowance as standard deduction", () => {
    expect(calculator.getStandardDeduction(2024, false)).toBe(12570);
    expect(calculator.getStandardDeduction(2024, true)).toBe(12570);
  });
});

// ============================================================================
// Germany
// ============================================================================

describe("GermanyTaxCalculator", () => {
  const calculator = new GermanyTaxCalculator();

  it("returns no deduction benefits for owner-occupied", () => {
    const result = calculator.calculateDeductionBenefits({
      year: 2024,
      homePrice: 400000,
      currentHomeValue: 410000,
      loanBalance: 320000,
      interestPaid: 10000,
      propertyTaxPaid: 1000,
      isJointReturn: false,
      marginalTaxRate: 0.42,
      otherDeductions: 0,
      yearsOwned: 1,
    });

    expect(result.deductionSavings).toBe(0);
    expect(result.deductibleInterest).toBe(0);
  });

  it("exempts primary residence from Spekulationssteuer", () => {
    const result = calculator.calculateCapitalGainsTax({
      purchasePrice: 300000,
      salePrice: 400000,
      yearsOwned: 3,
      isJointReturn: false,
      isPrimaryResidence: true,
    });

    expect(result.qualifiesForExemption).toBe(true);
    expect(result.taxableGain).toBe(0);
    expect(result.taxAmount).toBe(0);
  });

  it("exempts non-primary residence after 10 years (Spekulationsfrist)", () => {
    const result = calculator.calculateCapitalGainsTax({
      purchasePrice: 300000,
      salePrice: 400000,
      yearsOwned: 10,
      isJointReturn: false,
      isPrimaryResidence: false,
    });

    expect(result.qualifiesForExemption).toBe(true);
    expect(result.taxableGain).toBe(0);
    expect(result.taxAmount).toBe(0);
  });

  it("taxes non-primary residence sold within 10 years with solidarity surcharge", () => {
    const result = calculator.calculateCapitalGainsTax({
      purchasePrice: 300000,
      salePrice: 400000,
      yearsOwned: 5,
      isJointReturn: false,
      isPrimaryResidence: false,
    });

    expect(result.qualifiesForExemption).toBe(false);
    expect(result.taxableGain).toBe(100000);
    // 25% Abgeltungssteuer * 1.055 solidarity surcharge = 26.375%
    expect(result.taxAmount).toBeCloseTo(26375, 0);
  });

  it("returns Grundfreibetrag as standard deduction", () => {
    expect(calculator.getStandardDeduction(2024, false)).toBe(11604);
    expect(calculator.getStandardDeduction(2024, true)).toBe(23208);
  });
});

// ============================================================================
// France
// ============================================================================

describe("FranceTaxCalculator", () => {
  const calculator = new FranceTaxCalculator();

  it("returns no deduction benefits", () => {
    const result = calculator.calculateDeductionBenefits({
      year: 2024,
      homePrice: 350000,
      currentHomeValue: 360000,
      loanBalance: 280000,
      interestPaid: 9000,
      propertyTaxPaid: 3500,
      isJointReturn: false,
      marginalTaxRate: 0.30,
      otherDeductions: 0,
      yearsOwned: 1,
    });

    expect(result.deductionSavings).toBe(0);
  });

  it("fully exempts primary residence (no holding period)", () => {
    const result = calculator.calculateCapitalGainsTax({
      purchasePrice: 300000,
      salePrice: 500000,
      yearsOwned: 1,
      isJointReturn: false,
      isPrimaryResidence: true,
    });

    expect(result.qualifiesForExemption).toBe(true);
    expect(result.taxableGain).toBe(0);
    expect(result.taxAmount).toBe(0);
  });

  it("applies full rate for non-primary sold within 5 years", () => {
    const result = calculator.calculateCapitalGainsTax({
      purchasePrice: 200000,
      salePrice: 300000,
      yearsOwned: 3,
      isJointReturn: false,
      isPrimaryResidence: false,
    });

    // No taper relief within 5 years
    // Income tax: 100k * 19% = 19,000
    // Social charges: 100k * 17.2% = 17,200
    expect(result.taxAmount).toBeCloseTo(36200, 0);
  });

  it("applies taper relief after 6 years for non-primary", () => {
    const result = calculator.calculateCapitalGainsTax({
      purchasePrice: 200000,
      salePrice: 300000,
      yearsOwned: 10,
      isJointReturn: false,
      isPrimaryResidence: false,
    });

    // After 10 years: 5 taper years (years 6-10)
    // Income tax taper: 5 * 6% = 30% reduction
    // Social charges taper: 5 * 1.65% = 8.25% reduction
    // Income tax: 100k * (1 - 0.30) * 19% = 70k * 0.19 = 13,300
    // Social charges: 100k * (1 - 0.0825) * 17.2% = 91,750 * 0.172 = 15,781
    expect(result.taxAmount).toBeCloseTo(13300 + 15781, -1);
  });

  it("fully exempts income tax on non-primary after 22 years", () => {
    const result = calculator.calculateCapitalGainsTax({
      purchasePrice: 200000,
      salePrice: 400000,
      yearsOwned: 22,
      isJointReturn: false,
      isPrimaryResidence: false,
    });

    // Income tax portion fully exempt (100% taper)
    // Social charges still partially apply
    // Social taper at 22: 16 * 1.65% + 1.60% = 26.4% + 1.6% = 28%
    // Social: 200k * (1 - 0.28) * 17.2% = 144k * 0.172 = 24,768
    expect(result.taxableGain).toBe(0); // Income tax portion = 0
    expect(result.taxAmount).toBeCloseTo(24768, -2);
  });

  it("fully exempts non-primary after 30 years", () => {
    const result = calculator.calculateCapitalGainsTax({
      purchasePrice: 200000,
      salePrice: 500000,
      yearsOwned: 30,
      isJointReturn: false,
      isPrimaryResidence: false,
    });

    expect(result.taxAmount).toBeCloseTo(0, 0);
  });

  it("returns 0 as standard deduction (quotient familial system)", () => {
    expect(calculator.getStandardDeduction(2024, false)).toBe(0);
  });
});

// ============================================================================
// Canada
// ============================================================================

describe("CanadaTaxCalculator", () => {
  const calculator = new CanadaTaxCalculator();

  it("returns no deduction benefits", () => {
    const result = calculator.calculateDeductionBenefits({
      year: 2024,
      homePrice: 700000,
      currentHomeValue: 720000,
      loanBalance: 560000,
      interestPaid: 28000,
      propertyTaxPaid: 7000,
      isJointReturn: true,
      marginalTaxRate: 0.29,
      otherDeductions: 0,
      yearsOwned: 1,
    });

    expect(result.deductionSavings).toBe(0);
    expect(result.deductibleInterest).toBe(0);
  });

  it("fully exempts primary residence (PRE)", () => {
    const result = calculator.calculateCapitalGainsTax({
      purchasePrice: 500000,
      salePrice: 800000,
      yearsOwned: 1, // No minimum holding period
      isJointReturn: true,
      isPrimaryResidence: true,
    });

    expect(result.qualifiesForExemption).toBe(true);
    expect(result.taxableGain).toBe(0);
    expect(result.taxAmount).toBe(0);
  });

  it("applies 50% inclusion rate for non-primary gains under $250k", () => {
    const result = calculator.calculateCapitalGainsTax({
      purchasePrice: 400000,
      salePrice: 500000,
      yearsOwned: 3,
      isJointReturn: false,
      isPrimaryResidence: false,
    });

    // 100k gain * 50% inclusion = 50k taxable income
    // 50k * 25% (config CGT rate) = 12,500
    expect(result.taxableGain).toBe(50000);
    expect(result.taxAmount).toBeCloseTo(12500, 0);
  });

  it("applies tiered inclusion for gains above $250k", () => {
    const result = calculator.calculateCapitalGainsTax({
      purchasePrice: 400000,
      salePrice: 800000,
      yearsOwned: 5,
      isJointReturn: false,
      isPrimaryResidence: false,
    });

    // 400k gain: 250k * 50% + 150k * 66.67% = 125k + 100,005 = 225,005
    // 225,005 * 25% = 56,251.25
    expect(result.taxableGain).toBeCloseTo(225005, 0);
    expect(result.taxAmount).toBeCloseTo(56251, 0);
  });

  it("returns Basic Personal Amount as standard deduction", () => {
    expect(calculator.getStandardDeduction(2024, false)).toBe(15705);
    expect(calculator.getStandardDeduction(2024, true)).toBe(15705);
  });
});

// ============================================================================
// Spain
// ============================================================================

describe("SpainTaxCalculator", () => {
  const calculator = new SpainTaxCalculator();

  it("returns no deduction benefits (post-2013)", () => {
    const result = calculator.calculateDeductionBenefits({
      year: 2024,
      homePrice: 250000,
      currentHomeValue: 260000,
      loanBalance: 200000,
      interestPaid: 7000,
      propertyTaxPaid: 1500,
      isJointReturn: false,
      marginalTaxRate: 0.37,
      otherDeductions: 0,
      yearsOwned: 1,
    });

    expect(result.deductionSavings).toBe(0);
  });

  it("exempts primary residence (assumes reinvestment)", () => {
    const result = calculator.calculateCapitalGainsTax({
      purchasePrice: 200000,
      salePrice: 300000,
      yearsOwned: 5,
      isJointReturn: false,
      isPrimaryResidence: true,
    });

    expect(result.qualifiesForExemption).toBe(true);
    expect(result.taxableGain).toBe(0);
    expect(result.taxAmount).toBe(0);
  });

  it("applies progressive CGT brackets for non-primary", () => {
    const result = calculator.calculateCapitalGainsTax({
      purchasePrice: 100000,
      salePrice: 200000,
      yearsOwned: 3,
      isJointReturn: false,
      isPrimaryResidence: false,
    });

    // 100k gain: 6k * 19% + 44k * 21% + 50k * 23% = 1,140 + 9,240 + 11,500 = 21,880
    // Plus plusvalía: 100k * 1% = 1,000
    expect(result.taxableGain).toBe(100000);
    expect(result.taxAmount).toBeCloseTo(22880, 0);
  });

  it("applies highest bracket for large gains", () => {
    const result = calculator.calculateCapitalGainsTax({
      purchasePrice: 200000,
      salePrice: 600000,
      yearsOwned: 5,
      isJointReturn: false,
      isPrimaryResidence: false,
    });

    // 400k gain:
    // 6k * 19% = 1,140
    // 44k * 21% = 9,240
    // 150k * 23% = 34,500
    // 200k * 26% = 52,000
    // CGT total = 96,880
    // Plusvalía: 400k * 1% = 4,000
    // Total = 100,880
    expect(result.taxAmount).toBeCloseTo(100880, 0);
  });

  it("includes plusvalía municipal in tax calculation", () => {
    const result = calculator.calculateCapitalGainsTax({
      purchasePrice: 300000,
      salePrice: 310000,
      yearsOwned: 2,
      isJointReturn: false,
      isPrimaryResidence: false,
    });

    // 10k gain: 6k * 19% + 4k * 21% = 1,140 + 840 = 1,980
    // Plusvalía: 10k * 1% = 100
    // Total = 2,080
    expect(result.taxAmount).toBeCloseTo(2080, 0);
  });

  it("returns mínimo personal as standard deduction", () => {
    expect(calculator.getStandardDeduction(2024, false)).toBe(5550);
  });
});

describe("ItalyTaxCalculator", () => {
  const calculator = new ItalyTaxCalculator();

  it("allows 19% deduction on up to €4000 of interest", () => {
    const result = calculator.calculateDeductionBenefits({
      year: 2024,
      homePrice: 300000,
      currentHomeValue: 310000,
      loanBalance: 200000,
      interestPaid: 8000,
      propertyTaxPaid: 1200,
      isJointReturn: false,
      marginalTaxRate: 0.38,
      otherDeductions: 0,
      yearsOwned: 1,
    });

    expect(result.deductibleInterest).toBe(4000); // Capped at €4000
    expect(result.deductionSavings).toBe(760); // 4000 * 19%
  });

  it("requires 5 years for capital gains exemption", () => {
    const shortTerm = calculator.calculateCapitalGainsTax({
      purchasePrice: 200000,
      salePrice: 250000,
      yearsOwned: 3,
      isJointReturn: false,
      isPrimaryResidence: true,
    });

    expect(shortTerm.qualifiesForExemption).toBe(false);

    const longTerm = calculator.calculateCapitalGainsTax({
      purchasePrice: 200000,
      salePrice: 250000,
      yearsOwned: 5,
      isJointReturn: false,
      isPrimaryResidence: true,
    });

    expect(longTerm.qualifiesForExemption).toBe(true);
    expect(longTerm.taxAmount).toBe(0);
  });
});

describe("MexicoTaxCalculator", () => {
  const calculator = new MexicoTaxCalculator();

  it("allows limited mortgage interest deduction", () => {
    const result = calculator.calculateDeductionBenefits({
      year: 2024,
      homePrice: 5000000, // MXN
      currentHomeValue: 5150000,
      loanBalance: 4000000,
      interestPaid: 400000,
      propertyTaxPaid: 5000,
      isJointReturn: false,
      marginalTaxRate: 0.30,
      otherDeductions: 0,
      yearsOwned: 1,
    });

    // Interest capped at 3,500,000 (the max deductible amount)
    expect(result.deductibleInterest).toBeLessThanOrEqual(400000);
    expect(result.deductionSavings).toBeGreaterThan(0);
  });
});

describe("getTaxCalculator factory", () => {
  it("returns USTaxCalculator for US", () => {
    expect(getTaxCalculator("US")).toBeInstanceOf(USTaxCalculator);
  });

  it("returns UKTaxCalculator for GB", () => {
    expect(getTaxCalculator("GB")).toBeInstanceOf(UKTaxCalculator);
  });

  it("returns GermanyTaxCalculator for DE", () => {
    expect(getTaxCalculator("DE")).toBeInstanceOf(GermanyTaxCalculator);
  });

  it("returns FranceTaxCalculator for FR", () => {
    expect(getTaxCalculator("FR")).toBeInstanceOf(FranceTaxCalculator);
  });

  it("returns CanadaTaxCalculator for CA", () => {
    expect(getTaxCalculator("CA")).toBeInstanceOf(CanadaTaxCalculator);
  });

  it("returns SpainTaxCalculator for ES", () => {
    expect(getTaxCalculator("ES")).toBeInstanceOf(SpainTaxCalculator);
  });

  it("returns ItalyTaxCalculator for IT", () => {
    expect(getTaxCalculator("IT")).toBeInstanceOf(ItalyTaxCalculator);
  });

  it("returns MexicoTaxCalculator for MX", () => {
    expect(getTaxCalculator("MX")).toBeInstanceOf(MexicoTaxCalculator);
  });
});
