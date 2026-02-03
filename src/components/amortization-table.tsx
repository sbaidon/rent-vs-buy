import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCalculator } from "../context/calculator-context";
import {
  calculateAmortizationSchedule,
  AmortizationRow,
} from "../utils/amortization";
import { formatCurrency } from "../utils/format-currency";
import { useAppContext } from "../context/app-context";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AmortizationTableProps {
  className?: string;
}

const AmortizationTable: React.FC<AmortizationTableProps> = ({
  className = "",
}) => {
  const { t } = useTranslation();
  const { values } = useCalculator();
  const { currency } = useAppContext();

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 12; // Show 1 year at a time

  // Calculate the loan amount
  const loanAmount = values.homePrice * (1 - values.downPayment);

  // Generate the amortization schedule
  const schedule = useMemo(() => {
    return calculateAmortizationSchedule(
      loanAmount,
      values.mortgageRate,
      values.mortgageTerm,
      values.extraPayments
    );
  }, [
    loanAmount,
    values.mortgageRate,
    values.mortgageTerm,
    values.extraPayments,
  ]);

  // Calculate summary values
  const totalPaid = useMemo(() => {
    return schedule.reduce((sum, row) => sum + row.paymentAmount, 0);
  }, [schedule]);

  const totalInterest = useMemo(() => {
    return schedule.reduce((sum, row) => sum + row.interestPayment, 0);
  }, [schedule]);

  // Calculate pagination
  const totalPages = Math.ceil(schedule.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, schedule.length);
  const currentRows = schedule.slice(startIndex, endIndex);

  // Handle pagination
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Function to format currency values
  const formatValue = (value: number) => formatCurrency(value, currency);

  return (
    <div className={`${className}`}>
      <h3 className="text-lg font-medium mb-6 text-white">
        {t("calculator.amortization.title")}
      </h3>

      <div className="text-sm mb-6 bg-acadia-800 p-4 rounded-lg">
        <div className="flex flex-wrap gap-6 justify-between text-white">
          <div>
            <span className="font-medium">
              {t("calculator.amortization.loanAmount")}:{" "}
            </span>
            <span className="text-amber-100">{formatValue(loanAmount)}</span>
          </div>
          <div>
            <span className="font-medium">
              {t("calculator.amortization.term")}:{" "}
            </span>
            <span className="text-amber-100">
              {values.mortgageTerm} {t("years")}
            </span>
          </div>
          <div>
            <span className="font-medium">
              {t("calculator.amortization.rate")}:{" "}
            </span>
            <span className="text-amber-100">
              {(values.mortgageRate * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-acadia-700">
        <table className="min-w-full divide-y divide-acadia-700">
          <thead className="bg-acadia-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                {t("calculator.amortization.payment")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                {t("calculator.amortization.payment_amount")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                {t("calculator.amortization.principal")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                {t("calculator.amortization.interest")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                {t("calculator.amortization.remaining")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-acadia-900 divide-y divide-acadia-700">
            {currentRows.map((row: AmortizationRow) => (
              <tr key={row.paymentNumber} className="hover:bg-acadia-800">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                  {row.paymentNumber}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-amber-100">
                  {formatValue(row.paymentAmount)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-amber-100">
                  {formatValue(row.principalPayment)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-amber-100">
                  {formatValue(row.interestPayment)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-amber-100">
                  {formatValue(row.remainingBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Loan Summary Section */}
      <div className="mt-8 p-6 bg-amber-950 rounded-lg border-2 border-amber-800/50 shadow-lg">
        <h4 className="text-lg font-semibold mb-4 text-white">
          {t("calculator.amortization.loan_summary")}
        </h4>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex flex-col">
            <span className="text-sm text-amber-200 mb-1">
              {t("calculator.amortization.original_loan")}
            </span>
            <span className="text-xl font-bold text-white">
              {formatValue(loanAmount)}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-sm text-amber-200 mb-1">
              {t("calculator.amortization.total_interest")}
            </span>
            <span className="text-xl font-bold text-white">
              {formatValue(totalInterest)}
            </span>
          </div>

          <div className="flex flex-col bg-amber-900/40 p-3 rounded-lg border border-amber-700">
            <span className="text-sm text-amber-200 mb-1">
              {t("calculator.amortization.total_paid")}
            </span>
            <span className="text-2xl font-bold text-white">
              {formatValue(totalPaid)}
            </span>
            <div className="mt-2 text-xs text-amber-200">
              <span className="font-medium">
                {(totalPaid / loanAmount).toFixed(2)}x
              </span>{" "}
              {t("calculator.amortization.the_original_loan")}
            </div>
          </div>
        </div>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between mt-6 text-white">
        <div className="text-sm">
          {t("calculator.amortization.showing")} {startIndex + 1} - {endIndex}{" "}
          {t("calculator.amortization.of")} {schedule.length}
        </div>
        <div className="flex">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className="p-2 rounded-md mr-2 text-white hover:bg-acadia-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="p-2 rounded-md text-white hover:bg-acadia-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AmortizationTable;
