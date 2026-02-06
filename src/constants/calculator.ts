import { CalculatorValues } from "../context/calculator-context";

export const initialValues: CalculatorValues = {
  // Basic inputs
  pmi: 0,
  homePrice: 500000,
  monthlyRent: 2000,
  mortgageRate: 0.0725,
  mortgageTerm: 30,
  downPayment: 0.2,
  yearsToStay: 10,

  // Future projections
  homePriceGrowth: 0.03,
  rentGrowth: 0.03,
  investmentReturn: 0.045,
  inflationRate: 0.03,

  // Tax details
  isJointReturn: true,
  propertyTaxRate: 0.0135,
  marginalTaxRate: 0.2,
  otherDeductions: 0,
  taxCutsExpire: true,

  // Closing costs
  buyingCosts: 0.04,
  sellingCosts: 0.06,

  // Maintenance and fees
  maintenanceRate: 0.01,
  homeInsuranceRate: 0.0055,
  extraPayments: 100,

  // Renting costs
  securityDeposit: 1,
  brokerFee: 0,
  monthlyRentersInsurance: 100,

  // Country-specific toggles
  isNewBuild: false,
  isFirstTimeBuyer: false,
  isPrimaryResidence: true,
  willReinvest: true,
};
