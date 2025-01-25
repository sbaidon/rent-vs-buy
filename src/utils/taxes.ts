type TaxStatus = "expired" | "renewed";
type FilingStatus = "single" | "joint";

type TaxParameters = {
  standardDeduction: number;
  loanCap: number;
};

export class TaxesCalculator {
  private readonly taxConstants: Record<
    TaxStatus,
    Record<FilingStatus, TaxParameters>
  > = {
    expired: {
      single: {
        standardDeduction: 8126,
        loanCap: 500000,
      },
      joint: {
        standardDeduction: 16253,
        loanCap: 1000000,
      },
    },
    renewed: {
      single: {
        standardDeduction: 14600,
        loanCap: 375000,
      },
      joint: {
        standardDeduction: 29200,
        loanCap: 750000,
      },
    },
  };

  getSALTcap(year: number, taxCutsExpired: boolean): number {
    return !taxCutsExpired ? 10000 : year <= 2025 ? 10000 : Infinity;
  }

  getStandardDeduction(
    year: number,
    taxCutsExpired: boolean,
    isJointReturn: boolean
  ): number {
    if (year >= 2026 && taxCutsExpired) {
      return this.getParameters(true, isJointReturn).standardDeduction;
    } else {
      return this.getParameters(false, isJointReturn).standardDeduction;
    }
  }

  getLoanCap(
    year: number,
    taxCutsExpired: boolean,
    isJointReturn: boolean
  ): number {
    if (!taxCutsExpired) {
      return this.getParameters(false, isJointReturn).loanCap;
    } else if (year <= 2025) {
      return this.getParameters(false, isJointReturn).loanCap;
    } else {
      return this.getParameters(true, isJointReturn).loanCap;
    }
  }

  private getParameters(
    taxCutsExpired: boolean,
    isJointReturn: boolean
  ): TaxParameters {
    const taxStatus: TaxStatus = taxCutsExpired ? "expired" : "renewed";
    const filingStatus: FilingStatus = isJointReturn ? "joint" : "single";

    return this.taxConstants[taxStatus][filingStatus];
  }
}
