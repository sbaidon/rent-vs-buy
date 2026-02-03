/**
 * Represents a row in the amortization table
 */
export interface AmortizationRow {
  paymentNumber: number;
  paymentAmount: number;
  principalPayment: number;
  interestPayment: number;
  remainingBalance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

/**
 * Calculates the amortization schedule for a loan
 * @param loanAmount The initial loan amount
 * @param annualInterestRate The annual interest rate (as a decimal, e.g., 0.05 for 5%)
 * @param loanTermYears The loan term in years
 * @param extraPayment Additional monthly payment to principal (optional)
 * @returns An array of amortization rows
 */
export function calculateAmortizationSchedule(
  loanAmount: number,
  annualInterestRate: number,
  loanTermYears: number,
  extraPayment: number = 0
): AmortizationRow[] {
  // Convert annual rate to monthly and calculate total payments
  const monthlyRate = annualInterestRate / 12;
  const totalPayments = loanTermYears * 12;

  // Calculate the monthly payment using the loan formula
  const monthlyPayment =
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
    (Math.pow(1 + monthlyRate, totalPayments) - 1);

  // Initialize the schedule
  const schedule: AmortizationRow[] = [];
  let remainingBalance = loanAmount;
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;

  // Generate each payment row until the loan is paid off
  for (
    let paymentNumber = 1;
    remainingBalance > 0 && paymentNumber <= totalPayments;
    paymentNumber++
  ) {
    // Calculate interest for this period
    const interestPayment = remainingBalance * monthlyRate;

    // The regular principal portion is the monthly payment minus the interest
    let principalPayment = monthlyPayment - interestPayment;

    // Add the extra payment to the principal
    principalPayment += extraPayment;

    // Make sure we don't pay more than the remaining balance
    principalPayment = Math.min(principalPayment, remainingBalance);

    // Update the remaining balance
    remainingBalance -= principalPayment;

    // Update cumulative totals
    cumulativeInterest += interestPayment;
    cumulativePrincipal += principalPayment;

    // Add this payment to the schedule
    schedule.push({
      paymentNumber,
      paymentAmount: principalPayment + interestPayment,
      principalPayment,
      interestPayment,
      remainingBalance,
      cumulativeInterest,
      cumulativePrincipal,
    });

    // If the loan is paid off early (due to extra payments), break
    if (remainingBalance <= 0) {
      break;
    }
  }

  return schedule;
}
