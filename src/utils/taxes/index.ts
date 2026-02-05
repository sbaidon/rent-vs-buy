/**
 * Tax calculation module
 * 
 * Provides country-specific tax calculations for rent vs buy analysis.
 * Each country has different rules for:
 * - Mortgage interest deductibility
 * - Capital gains taxes and exemptions
 * - Property tax deductions
 * - Standard deductions
 */

import type { CountryCode, CountryConfig } from "../../constants/country-rules";
import { getCountryConfig } from "../../constants/country-rules";

export interface TaxCalculationParams {
  year: number;
  homePrice: number;
  currentHomeValue: number;
  loanBalance: number;
  interestPaid: number;
  propertyTaxPaid: number;
  isJointReturn: boolean;
  marginalTaxRate: number;
  otherDeductions: number;
  yearsOwned: number;
  // US-specific
  taxCutsExpire?: boolean;
}

export interface TaxBenefits {
  /** Total tax savings from deductions */
  deductionSavings: number;
  /** Amount of interest that's deductible */
  deductibleInterest: number;
  /** Amount of property tax that's deductible */
  deductiblePropertyTax: number;
}

export interface CapitalGainsTax {
  /** Taxable gain after exemptions */
  taxableGain: number;
  /** Tax owed on the gain */
  taxAmount: number;
  /** Whether the gain qualifies for exemption */
  qualifiesForExemption: boolean;
}

/**
 * Base interface for country-specific tax calculators
 */
export interface CountryTaxCalculator {
  /**
   * Calculate annual tax benefits from homeownership deductions
   */
  calculateDeductionBenefits(params: TaxCalculationParams): TaxBenefits;

  /**
   * Calculate capital gains tax on property sale
   */
  calculateCapitalGainsTax(params: {
    purchasePrice: number;
    salePrice: number;
    yearsOwned: number;
    isJointReturn: boolean;
    isPrimaryResidence: boolean;
  }): CapitalGainsTax;

  /**
   * Get the standard deduction for the given year and filing status
   */
  getStandardDeduction(year: number, isJointReturn: boolean): number;

  /**
   * Get the maximum loan amount eligible for interest deduction
   */
  getLoanCap(year: number, isJointReturn: boolean): number;
}

/**
 * US Tax Calculator
 * 
 * Implements US-specific tax rules:
 * - Mortgage interest deduction (up to $750k loan for post-2017)
 * - SALT deduction cap ($10k)
 * - Capital gains exclusion ($250k single, $500k joint)
 * - Tax Cuts and Jobs Act considerations
 */
export class USTaxCalculator implements CountryTaxCalculator {
  private readonly config: CountryConfig;

  // Tax Cuts and Jobs Act constants
  private readonly TCJA_LOAN_CAP_SINGLE = 375000;
  private readonly TCJA_LOAN_CAP_JOINT = 750000;
  private readonly PRE_TCJA_LOAN_CAP_SINGLE = 500000;
  private readonly PRE_TCJA_LOAN_CAP_JOINT = 1000000;
  
  private readonly TCJA_STANDARD_SINGLE = 14600;
  private readonly TCJA_STANDARD_JOINT = 29200;
  private readonly PRE_TCJA_STANDARD_SINGLE = 8126;
  private readonly PRE_TCJA_STANDARD_JOINT = 16253;

  private readonly SALT_CAP = 10000;
  private readonly CAPITAL_GAINS_RATE = 0.15;
  private readonly CAPITAL_GAINS_EXCLUSION_SINGLE = 250000;
  private readonly CAPITAL_GAINS_EXCLUSION_JOINT = 500000;

  constructor() {
    this.config = getCountryConfig("US");
  }

  calculateDeductionBenefits(params: TaxCalculationParams): TaxBenefits {
    const {
      year,
      loanBalance,
      interestPaid,
      propertyTaxPaid,
      isJointReturn,
      marginalTaxRate,
      otherDeductions,
      taxCutsExpire = true,
    } = params;

    // Get loan cap for interest deduction
    const loanCap = this.getLoanCap(year, isJointReturn, taxCutsExpire);
    
    // Calculate deductible interest (prorated if loan exceeds cap)
    const deductibleFraction = loanBalance > 0 ? Math.min(1, loanCap / loanBalance) : 1;
    const deductibleInterest = interestPaid * deductibleFraction;

    // SALT cap applies to property tax + state/local taxes
    const saltCap = this.getSALTCap(year, taxCutsExpire);
    const deductiblePropertyTax = Math.min(propertyTaxPaid, saltCap);

    // Calculate itemized deductions
    const totalItemizedDeductions = deductibleInterest + deductiblePropertyTax + otherDeductions;
    
    // Compare to standard deduction
    const standardDeduction = this.getStandardDeduction(year, isJointReturn, taxCutsExpire);
    
    // Tax benefit is the marginal rate times the excess over standard deduction
    const excessDeductions = Math.max(0, totalItemizedDeductions - Math.max(otherDeductions, standardDeduction));
    const deductionSavings = excessDeductions * marginalTaxRate;

    return {
      deductionSavings,
      deductibleInterest,
      deductiblePropertyTax,
    };
  }

  calculateCapitalGainsTax(params: {
    purchasePrice: number;
    salePrice: number;
    yearsOwned: number;
    isJointReturn: boolean;
    isPrimaryResidence: boolean;
  }): CapitalGainsTax {
    const { purchasePrice, salePrice, yearsOwned, isJointReturn, isPrimaryResidence } = params;

    const gain = salePrice - purchasePrice;
    
    // Primary residence exclusion requires 2+ years of ownership
    const qualifiesForExemption = isPrimaryResidence && yearsOwned >= 2;
    
    const exclusion = qualifiesForExemption
      ? (isJointReturn ? this.CAPITAL_GAINS_EXCLUSION_JOINT : this.CAPITAL_GAINS_EXCLUSION_SINGLE)
      : 0;

    const taxableGain = Math.max(0, gain - exclusion);
    const taxAmount = taxableGain * this.CAPITAL_GAINS_RATE;

    return {
      taxableGain,
      taxAmount,
      qualifiesForExemption,
    };
  }

  getStandardDeduction(year: number, isJointReturn: boolean, taxCutsExpire: boolean = true): number {
    // TCJA expires after 2025 if taxCutsExpire is true
    const useTCJA = !taxCutsExpire || year <= 2025;
    
    if (useTCJA) {
      return isJointReturn ? this.TCJA_STANDARD_JOINT : this.TCJA_STANDARD_SINGLE;
    } else {
      return isJointReturn ? this.PRE_TCJA_STANDARD_JOINT : this.PRE_TCJA_STANDARD_SINGLE;
    }
  }

  getLoanCap(year: number, isJointReturn: boolean, taxCutsExpire: boolean = true): number {
    const useTCJA = !taxCutsExpire || year <= 2025;
    
    if (useTCJA) {
      return isJointReturn ? this.TCJA_LOAN_CAP_JOINT : this.TCJA_LOAN_CAP_SINGLE;
    } else {
      return isJointReturn ? this.PRE_TCJA_LOAN_CAP_JOINT : this.PRE_TCJA_LOAN_CAP_SINGLE;
    }
  }

  private getSALTCap(year: number, taxCutsExpire: boolean): number {
    // SALT cap only applies during TCJA period
    const useTCJA = !taxCutsExpire || year <= 2025;
    return useTCJA ? this.SALT_CAP : Infinity;
  }
}

/**
 * Generic Tax Calculator for countries without mortgage interest deduction
 * 
 * Fallback for any country that doesn't have a dedicated calculator.
 * No mortgage interest deduction; primary residence exempt from capital gains.
 */
export class NonDeductibleTaxCalculator implements CountryTaxCalculator {
  constructor(private readonly countryCode: CountryCode) {}

  private get config(): CountryConfig {
    return getCountryConfig(this.countryCode);
  }

  calculateDeductionBenefits(_params: TaxCalculationParams): TaxBenefits {
    return {
      deductionSavings: 0,
      deductibleInterest: 0,
      deductiblePropertyTax: 0,
    };
  }

  calculateCapitalGainsTax(params: {
    purchasePrice: number;
    salePrice: number;
    yearsOwned: number;
    isJointReturn: boolean;
    isPrimaryResidence: boolean;
  }): CapitalGainsTax {
    const { purchasePrice, salePrice, isPrimaryResidence } = params;
    const { taxRules } = this.config;

    const gain = salePrice - purchasePrice;
    const qualifiesForExemption = isPrimaryResidence;
    const taxableGain = qualifiesForExemption ? 0 : Math.max(0, gain);
    const taxAmount = taxableGain * taxRules.capitalGainsTaxRate;

    return { taxableGain, taxAmount, qualifiesForExemption };
  }

  getStandardDeduction(_year: number, isJointReturn: boolean): number {
    const { taxRules } = this.config;
    return isJointReturn ? taxRules.standardDeduction.joint : taxRules.standardDeduction.single;
  }

  getLoanCap(_year: number, _isJointReturn: boolean): number {
    return Infinity;
  }
}

// ============================================================================
// United Kingdom
// ============================================================================

/**
 * UK Tax Calculator
 * 
 * - No mortgage interest deduction for owner-occupied residential property
 *   (since April 2020, landlords get a 20% tax credit instead — not modelled here)
 * - Stamp Duty Land Tax (SDLT) on purchase — progressive brackets:
 *     £0-250k: 0%, £250k-925k: 5%, £925k-1.5M: 10%, >£1.5M: 12%
 *   (SDLT is a closing cost, modelled in country-rules closingCosts; we keep
 *    it here so the calculator can compute the exact bracket amount if needed.)
 * - Capital Gains Tax: primary residence fully exempt via Principal Private
 *   Residence Relief (PPR). Non-PPR residential: 18% basic / 24% higher rate.
 * - Annual CGT exempt amount: £3,000 (2024-25 onwards, was £6,000 in 2023-24)
 */
export class UKTaxCalculator implements CountryTaxCalculator {
  // SDLT brackets (England & Northern Ireland, 2024-25)
  private readonly SDLT_BRACKETS: { threshold: number; rate: number }[] = [
    { threshold: 250_000, rate: 0 },
    { threshold: 925_000, rate: 0.05 },
    { threshold: 1_500_000, rate: 0.10 },
    { threshold: Infinity, rate: 0.12 },
  ];

  // CGT rates for residential property (non-PPR)
  private readonly CGT_BASIC_RATE = 0.18;
  private readonly CGT_HIGHER_RATE = 0.24;
  // Annual exempt amount (from 2024-25)
  private readonly CGT_ANNUAL_EXEMPT = 3_000;
  // Personal allowance
  private readonly PERSONAL_ALLOWANCE = 12_570;

  calculateDeductionBenefits(_params: TaxCalculationParams): TaxBenefits {
    // No mortgage interest deduction for owner-occupied property in UK
    return {
      deductionSavings: 0,
      deductibleInterest: 0,
      deductiblePropertyTax: 0,
    };
  }

  calculateCapitalGainsTax(params: {
    purchasePrice: number;
    salePrice: number;
    yearsOwned: number;
    isJointReturn: boolean;
    isPrimaryResidence: boolean;
  }): CapitalGainsTax {
    const { purchasePrice, salePrice, isPrimaryResidence } = params;

    const gain = salePrice - purchasePrice;

    // PPR: primary residence is fully exempt
    if (isPrimaryResidence) {
      return { taxableGain: 0, taxAmount: 0, qualifiesForExemption: true };
    }

    // Non-PPR: apply annual exempt amount, then higher rate (conservative)
    const taxableGain = Math.max(0, gain - this.CGT_ANNUAL_EXEMPT);
    // Use higher rate as default (most property sellers are higher-rate taxpayers)
    const taxAmount = taxableGain * this.CGT_HIGHER_RATE;

    return { taxableGain, taxAmount, qualifiesForExemption: false };
  }

  /**
   * Calculate Stamp Duty Land Tax (exact bracket calculation).
   * Useful if we want to show SDLT breakdown in the UI.
   */
  calculateSDLT(purchasePrice: number): number {
    let tax = 0;
    let previousThreshold = 0;

    for (const bracket of this.SDLT_BRACKETS) {
      if (purchasePrice <= previousThreshold) break;

      const taxableAmount = Math.min(purchasePrice, bracket.threshold) - previousThreshold;
      tax += Math.max(0, taxableAmount) * bracket.rate;
      previousThreshold = bracket.threshold;
    }

    return tax;
  }

  getStandardDeduction(_year: number, _isJointReturn: boolean): number {
    return this.PERSONAL_ALLOWANCE;
  }

  getLoanCap(_year: number, _isJointReturn: boolean): number {
    return Infinity; // No loan cap — no mortgage interest deduction
  }
}

// ============================================================================
// Germany
// ============================================================================

/**
 * Germany Tax Calculator
 *
 * - No mortgage interest deduction for owner-occupied homes
 *   (Deductible only for rental/investment properties, not modelled here)
 * - Grunderwerbsteuer (property transfer tax): varies 3.5-6.5% by Bundesland.
 *   National average ~5%. Modelled in closingCosts; here for reference.
 * - Spekulationssteuer: capital gains on private real estate sales are taxable
 *   if sold within 10 years of purchase. After 10 years: fully exempt.
 *   Tax rate = personal marginal income tax rate + 5.5% solidarity surcharge.
 * - No annual CGT exempt amount for property (the €1,000 Freistellungs­auftrag
 *   only applies to investment income, not real estate).
 */
export class GermanyTaxCalculator implements CountryTaxCalculator {
  // Solidarity surcharge on income tax (applies to capital gains within 10yr)
  private readonly SOLIDARITY_SURCHARGE_RATE = 0.055;

  calculateDeductionBenefits(_params: TaxCalculationParams): TaxBenefits {
    // No mortgage interest deduction for owner-occupied property
    return {
      deductionSavings: 0,
      deductibleInterest: 0,
      deductiblePropertyTax: 0,
    };
  }

  calculateCapitalGainsTax(params: {
    purchasePrice: number;
    salePrice: number;
    yearsOwned: number;
    isJointReturn: boolean;
    isPrimaryResidence: boolean;
  }): CapitalGainsTax {
    const { purchasePrice, salePrice, yearsOwned, isPrimaryResidence } = params;

    const gain = salePrice - purchasePrice;

    // Spekulationsfrist: exempt if held >= 10 years OR if owner-occupied
    // for the entire period (or at least the last 2 calendar years + year of sale).
    // We simplify: primary residence OR held 10+ years = exempt.
    const qualifiesForExemption = isPrimaryResidence || yearsOwned >= 10;

    if (qualifiesForExemption || gain <= 0) {
      return { taxableGain: 0, taxAmount: 0, qualifiesForExemption: true };
    }

    // Taxed at marginal income tax rate. We use the config's capitalGainsTaxRate
    // (25% Abgeltungssteuer) as a proxy, plus solidarity surcharge.
    const config = getCountryConfig("DE");
    const baseRate = config.taxRules.capitalGainsTaxRate;
    const effectiveRate = baseRate * (1 + this.SOLIDARITY_SURCHARGE_RATE);

    const taxableGain = Math.max(0, gain);
    const taxAmount = taxableGain * effectiveRate;

    return { taxableGain, taxAmount, qualifiesForExemption: false };
  }

  getStandardDeduction(_year: number, isJointReturn: boolean): number {
    // Grundfreibetrag (basic tax-free allowance)
    const config = getCountryConfig("DE");
    return isJointReturn
      ? config.taxRules.standardDeduction.joint
      : config.taxRules.standardDeduction.single;
  }

  getLoanCap(_year: number, _isJointReturn: boolean): number {
    return Infinity;
  }
}

// ============================================================================
// France
// ============================================================================

/**
 * France Tax Calculator
 *
 * - No mortgage interest deduction for primary residence (removed in 2011)
 * - Frais de notaire (notary fees): ~7-8% for existing builds, ~2-3% new.
 *   Modelled in closingCosts.
 * - Capital gains (plus-value immobilière):
 *   - Primary residence: FULLY EXEMPT (no minimum holding period)
 *   - Secondary/investment: 19% income tax + 17.2% prélèvements sociaux = 36.2%
 *     - Taper relief on income tax portion: 6% per year from year 6-21, 4% year 22
 *       → full exemption after 22 years
 *     - Taper relief on social charges: 1.65% per year from year 6-21,
 *       1.60% year 22, 9% per year years 23-30 → full exemption after 30 years
 * - No standard deduction in the US sense; France uses quotient familial system.
 */
export class FranceTaxCalculator implements CountryTaxCalculator {
  private readonly INCOME_TAX_RATE_ON_GAINS = 0.19;
  private readonly SOCIAL_CHARGES_RATE = 0.172;

  calculateDeductionBenefits(_params: TaxCalculationParams): TaxBenefits {
    // No mortgage interest deduction for primary residence
    return {
      deductionSavings: 0,
      deductibleInterest: 0,
      deductiblePropertyTax: 0,
    };
  }

  calculateCapitalGainsTax(params: {
    purchasePrice: number;
    salePrice: number;
    yearsOwned: number;
    isJointReturn: boolean;
    isPrimaryResidence: boolean;
  }): CapitalGainsTax {
    const { purchasePrice, salePrice, yearsOwned, isPrimaryResidence } = params;

    const gain = salePrice - purchasePrice;

    // Primary residence: fully exempt, no minimum holding period
    if (isPrimaryResidence) {
      return { taxableGain: 0, taxAmount: 0, qualifiesForExemption: true };
    }

    if (gain <= 0) {
      return { taxableGain: 0, taxAmount: 0, qualifiesForExemption: false };
    }

    // Taper relief for income tax portion (abattement pour durée de détention)
    const incomeTaxTaper = this.calculateIncomeTaxTaper(yearsOwned);
    // Taper relief for social charges
    const socialChargesTaper = this.calculateSocialChargesTaper(yearsOwned);

    const taxableForIncomeTax = gain * (1 - incomeTaxTaper);
    const taxableForSocialCharges = gain * (1 - socialChargesTaper);

    const incomeTax = taxableForIncomeTax * this.INCOME_TAX_RATE_ON_GAINS;
    const socialCharges = taxableForSocialCharges * this.SOCIAL_CHARGES_RATE;

    const totalTax = incomeTax + socialCharges;
    // Report the income-tax taxable amount as the "taxable gain" for UI
    const taxableGain = taxableForIncomeTax;

    return {
      taxableGain: Math.max(0, taxableGain),
      taxAmount: Math.max(0, totalTax),
      qualifiesForExemption: false,
    };
  }

  /**
   * Income tax taper relief (abattement):
   * Years 1-5: 0%
   * Years 6-21: 6% per year (cumulative from year 6)
   * Year 22: 4%
   * Year 23+: fully exempt (100%)
   */
  private calculateIncomeTaxTaper(yearsOwned: number): number {
    if (yearsOwned >= 22) return 1; // Fully exempt
    if (yearsOwned <= 5) return 0;
    // Years 6-21: 6% per completed year beyond 5
    const taperYears = Math.min(yearsOwned - 5, 16);
    let taper = taperYears * 0.06;
    // Year 22 adds 4% (but we already returned 1 for >= 22)
    if (yearsOwned === 21) taper = 16 * 0.06; // = 0.96, then year 22 adds 4% to reach 100%
    return Math.min(taper, 1);
  }

  /**
   * Social charges taper relief:
   * Years 1-5: 0%
   * Years 6-21: 1.65% per year
   * Year 22: 1.60%
   * Years 23-30: 9% per year
   * Year 31+: fully exempt
   */
  private calculateSocialChargesTaper(yearsOwned: number): number {
    if (yearsOwned >= 30) return 1;
    if (yearsOwned <= 5) return 0;

    let taper = 0;
    // Years 6-21
    const years6to21 = Math.min(yearsOwned - 5, 16);
    taper += years6to21 * 0.0165;

    // Year 22
    if (yearsOwned >= 22) {
      taper += 0.016;
    }

    // Years 23-30
    if (yearsOwned >= 23) {
      const years23to30 = Math.min(yearsOwned - 22, 8);
      taper += years23to30 * 0.09;
    }

    return Math.min(taper, 1);
  }

  getStandardDeduction(_year: number, _isJointReturn: boolean): number {
    return 0; // France uses quotient familial, not a standard deduction
  }

  getLoanCap(_year: number, _isJointReturn: boolean): number {
    return Infinity;
  }
}

// ============================================================================
// Canada
// ============================================================================

/**
 * Canada Tax Calculator
 *
 * - No mortgage interest deduction for owner-occupied homes
 * - Principal Residence Exemption (PRE): primary residence fully exempt from
 *   capital gains, no minimum holding period required. Applies to one property
 *   per family unit per year.
 * - Non-principal residence: 50% inclusion rate on capital gains (i.e., only
 *   half the gain is added to income and taxed at marginal rate).
 *   As of June 25, 2024: inclusion rate increases to 66.7% for gains above $250k.
 * - Land Transfer Tax varies by province (Ontario ~1.5% avg, BC ~1.5%,
 *   Toronto has additional municipal LTT). Modelled in closingCosts.
 * - Basic Personal Amount (BPA): $15,705 (2024) — federal tax-free threshold.
 */
export class CanadaTaxCalculator implements CountryTaxCalculator {
  // Capital gains inclusion rate (50% of gain is taxable)
  private readonly INCLUSION_RATE = 0.50;
  // Higher inclusion rate for gains > $250k (2024+)
  private readonly HIGHER_INCLUSION_RATE = 0.6667;
  private readonly HIGHER_INCLUSION_THRESHOLD = 250_000;

  calculateDeductionBenefits(_params: TaxCalculationParams): TaxBenefits {
    // No mortgage interest deduction for owner-occupied property
    return {
      deductionSavings: 0,
      deductibleInterest: 0,
      deductiblePropertyTax: 0,
    };
  }

  calculateCapitalGainsTax(params: {
    purchasePrice: number;
    salePrice: number;
    yearsOwned: number;
    isJointReturn: boolean;
    isPrimaryResidence: boolean;
  }): CapitalGainsTax {
    const { purchasePrice, salePrice, isPrimaryResidence } = params;

    const gain = salePrice - purchasePrice;

    // Principal Residence Exemption: fully exempt
    if (isPrimaryResidence) {
      return { taxableGain: 0, taxAmount: 0, qualifiesForExemption: true };
    }

    if (gain <= 0) {
      return { taxableGain: 0, taxAmount: 0, qualifiesForExemption: false };
    }

    // Tiered inclusion: 50% up to $250k, 66.7% above $250k
    let taxableIncome: number;
    if (gain <= this.HIGHER_INCLUSION_THRESHOLD) {
      taxableIncome = gain * this.INCLUSION_RATE;
    } else {
      taxableIncome =
        this.HIGHER_INCLUSION_THRESHOLD * this.INCLUSION_RATE +
        (gain - this.HIGHER_INCLUSION_THRESHOLD) * this.HIGHER_INCLUSION_RATE;
    }

    // Use config's capitalGainsTaxRate as the marginal tax rate proxy
    const config = getCountryConfig("CA");
    const taxAmount = taxableIncome * config.taxRules.capitalGainsTaxRate;

    return {
      taxableGain: taxableIncome,
      taxAmount,
      qualifiesForExemption: false,
    };
  }

  getStandardDeduction(_year: number, _isJointReturn: boolean): number {
    // Basic Personal Amount (same for joint — each person gets it)
    const config = getCountryConfig("CA");
    return config.taxRules.standardDeduction.single;
  }

  getLoanCap(_year: number, _isJointReturn: boolean): number {
    return Infinity;
  }
}

// ============================================================================
// Spain
// ============================================================================

/**
 * Spain Tax Calculator
 *
 * - No mortgage interest deduction (removed January 2013).
 *   Pre-2013 mortgages are grandfathered — not modelled here.
 * - Capital gains (ganancias patrimoniales):
 *   - Primary residence: exempt IF proceeds are reinvested in a new primary
 *     residence within 2 years. We assume reinvestment for simplicity.
 *   - Progressive rates on non-exempt gains:
 *       First €6,000: 19%
 *       €6,000 - €50,000: 21%
 *       €50,000 - €200,000: 23%
 *       >€200,000: 26% (since 2023)
 * - Plusvalía municipal (municipal capital gains tax): charged by municipalities
 *   based on cadastral value increase. Varies widely. We model a simplified
 *   version as a flat percentage of the gain (typically 0.5-3% of cadastral gain).
 * - IBI (Impuesto sobre Bienes Inmuebles): property tax, 0.4-1.1% of cadastral
 *   value. Modelled in closingCosts/defaults.
 * - ITP (Impuesto de Transmisiones Patrimoniales): 6-10% by region, ~8% avg.
 *   Modelled in closingCosts.
 */
export class SpainTaxCalculator implements CountryTaxCalculator {
  // Progressive capital gains tax brackets
  private readonly CGT_BRACKETS: { threshold: number; rate: number }[] = [
    { threshold: 6_000, rate: 0.19 },
    { threshold: 50_000, rate: 0.21 },
    { threshold: 200_000, rate: 0.23 },
    { threshold: Infinity, rate: 0.26 },
  ];

  // Simplified plusvalía municipal rate (as fraction of gain)
  private readonly PLUSVALIA_RATE = 0.01;

  calculateDeductionBenefits(_params: TaxCalculationParams): TaxBenefits {
    // No mortgage interest deduction (post-2013)
    return {
      deductionSavings: 0,
      deductibleInterest: 0,
      deductiblePropertyTax: 0,
    };
  }

  calculateCapitalGainsTax(params: {
    purchasePrice: number;
    salePrice: number;
    yearsOwned: number;
    isJointReturn: boolean;
    isPrimaryResidence: boolean;
  }): CapitalGainsTax {
    const { purchasePrice, salePrice, isPrimaryResidence } = params;

    const gain = salePrice - purchasePrice;

    // Primary residence exempt if reinvested (we assume reinvestment)
    if (isPrimaryResidence) {
      return { taxableGain: 0, taxAmount: 0, qualifiesForExemption: true };
    }

    if (gain <= 0) {
      return { taxableGain: 0, taxAmount: 0, qualifiesForExemption: false };
    }

    // Progressive capital gains tax
    const cgtAmount = this.calculateProgressiveCGT(gain);

    // Plusvalía municipal (simplified)
    const plusvalia = Math.max(0, gain) * this.PLUSVALIA_RATE;

    const totalTax = cgtAmount + plusvalia;

    return {
      taxableGain: gain,
      taxAmount: totalTax,
      qualifiesForExemption: false,
    };
  }

  private calculateProgressiveCGT(gain: number): number {
    let tax = 0;
    let previousThreshold = 0;

    for (const bracket of this.CGT_BRACKETS) {
      if (gain <= previousThreshold) break;

      const taxableInBracket = Math.min(gain, bracket.threshold) - previousThreshold;
      tax += Math.max(0, taxableInBracket) * bracket.rate;
      previousThreshold = bracket.threshold;
    }

    return tax;
  }

  getStandardDeduction(_year: number, _isJointReturn: boolean): number {
    // Mínimo personal (personal minimum)
    const config = getCountryConfig("ES");
    return config.taxRules.standardDeduction.single;
  }

  getLoanCap(_year: number, _isJointReturn: boolean): number {
    return Infinity;
  }
}

/**
 * Italy Tax Calculator
 * 
 * Italy has limited mortgage interest deduction (19% of up to €4000/year)
 */
export class ItalyTaxCalculator implements CountryTaxCalculator {
  private readonly config: CountryConfig;
  private readonly MAX_DEDUCTIBLE_INTEREST = 4000;
  private readonly DEDUCTION_RATE = 0.19;

  constructor() {
    this.config = getCountryConfig("IT");
  }

  calculateDeductionBenefits(params: TaxCalculationParams): TaxBenefits {
    const { interestPaid } = params;

    // Italy allows 19% deduction on up to €4000 of interest
    const deductibleInterest = Math.min(interestPaid, this.MAX_DEDUCTIBLE_INTEREST);
    const deductionSavings = deductibleInterest * this.DEDUCTION_RATE;

    return {
      deductionSavings,
      deductibleInterest,
      deductiblePropertyTax: 0,
    };
  }

  calculateCapitalGainsTax(params: {
    purchasePrice: number;
    salePrice: number;
    yearsOwned: number;
    isJointReturn: boolean;
    isPrimaryResidence: boolean;
  }): CapitalGainsTax {
    const { purchasePrice, salePrice, yearsOwned, isPrimaryResidence } = params;
    const { taxRules } = this.config;

    const gain = salePrice - purchasePrice;
    
    // Primary residence exempt after 5 years
    const qualifiesForExemption = isPrimaryResidence && yearsOwned >= 5;
    const taxableGain = qualifiesForExemption ? 0 : Math.max(0, gain);
    const taxAmount = taxableGain * taxRules.capitalGainsTaxRate;

    return {
      taxableGain,
      taxAmount,
      qualifiesForExemption,
    };
  }

  getStandardDeduction(_year: number, _isJointReturn: boolean): number {
    return 0;
  }

  getLoanCap(_year: number, _isJointReturn: boolean): number {
    return this.MAX_DEDUCTIBLE_INTEREST / 0.05; // Approximate based on typical rates
  }
}

/**
 * Mexico Tax Calculator
 * 
 * Mexico has limited mortgage interest deduction with UDI-based limits
 */
export class MexicoTaxCalculator implements CountryTaxCalculator {
  private readonly config: CountryConfig;
  private readonly ISR_RATE = 0.35;

  constructor() {
    this.config = getCountryConfig("MX");
  }

  calculateDeductionBenefits(params: TaxCalculationParams): TaxBenefits {
    const { interestPaid, marginalTaxRate } = params;
    const { taxRules } = this.config;

    // Limited deduction based on UDI limits
    const maxDeductible = taxRules.maxDeductibleInterest || 0;
    const deductibleInterest = Math.min(interestPaid, maxDeductible);
    const deductionSavings = deductibleInterest * marginalTaxRate;

    return {
      deductionSavings,
      deductibleInterest,
      deductiblePropertyTax: 0,
    };
  }

  calculateCapitalGainsTax(params: {
    purchasePrice: number;
    salePrice: number;
    yearsOwned: number;
    isJointReturn: boolean;
    isPrimaryResidence: boolean;
  }): CapitalGainsTax {
    const { purchasePrice, salePrice, isPrimaryResidence } = params;
    const { taxRules } = this.config;

    const gain = salePrice - purchasePrice;
    
    // Primary residence has limited exemption
    const exemption = isPrimaryResidence ? taxRules.capitalGainsExemption : 0;
    const taxableGain = Math.max(0, gain - exemption);
    const taxAmount = taxableGain * this.ISR_RATE;

    return {
      taxableGain,
      taxAmount,
      qualifiesForExemption: isPrimaryResidence && gain <= exemption,
    };
  }

  getStandardDeduction(_year: number, _isJointReturn: boolean): number {
    return 0;
  }

  getLoanCap(_year: number, _isJointReturn: boolean): number {
    return this.config.taxRules.maxDeductibleInterest || Infinity;
  }
}

/**
 * Factory function to get the appropriate tax calculator for a country
 */
export function getTaxCalculator(countryCode: CountryCode): CountryTaxCalculator {
  switch (countryCode) {
    case "US":
      return new USTaxCalculator();
    case "GB":
      return new UKTaxCalculator();
    case "DE":
      return new GermanyTaxCalculator();
    case "FR":
      return new FranceTaxCalculator();
    case "CA":
      return new CanadaTaxCalculator();
    case "ES":
      return new SpainTaxCalculator();
    case "IT":
      return new ItalyTaxCalculator();
    case "MX":
      return new MexicoTaxCalculator();
    default:
      return new NonDeductibleTaxCalculator(countryCode);
  }
}


