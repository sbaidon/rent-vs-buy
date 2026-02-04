import React, { useState, useMemo } from "react";
import { useCalculator } from "../context/calculator-context";
import { BuyingCostsCalculator } from "../utils/buy-costs-calculator";
import { RentingCostsCalculator } from "../utils/rent-costs-calculator";
import { calculateAmortizationSchedule } from "../utils/amortization";
import { formatCurrency } from "../utils/format-currency";
import { useTranslation } from "react-i18next";
import { useAppContext } from "../context/app-context";
import { AreaChart } from "./area-chart";
import Tooltip from "./tooltip";
import { BarChart3, Table2, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";

type TabId = "summary" | "chart" | "amortization";
type ViewMode = "regular" | "cumulative" | "difference";

const TabbedResults = React.memo(() => {
  const { t } = useTranslation();
  const { values, reset } = useCalculator();
  const { currency } = useAppContext();
  const [showToast, setShowToast] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [viewMode, setViewMode] = useState<ViewMode>("cumulative");
  const [amortizationPage, setAmortizationPage] = useState(1);
  const rowsPerPage = 12;

  const results = useMemo(() => {
    const buyingCalculator = new BuyingCostsCalculator(values);
    const rentingCalculator = new RentingCostsCalculator(values);
    return {
      buying: buyingCalculator.calculate(),
      renting: rentingCalculator.calculate(),
    };
  }, [values]);

  const savings = useMemo(() => {
    return Math.abs(results.buying.totalCost) - Math.abs(results.renting.totalCost);
  }, [results]);

  const isRentingBetter = results.renting.totalCost < results.buying.totalCost;

  // Amortization calculations
  const loanAmount = values.homePrice * (1 - values.downPayment);
  const amortizationSchedule = useMemo(() => {
    return calculateAmortizationSchedule(
      loanAmount,
      values.mortgageRate,
      values.mortgageTerm,
      values.extraPayments
    );
  }, [loanAmount, values.mortgageRate, values.mortgageTerm, values.extraPayments]);

  const totalAmortizationPaid = useMemo(() => {
    return amortizationSchedule.reduce((sum, row) => sum + row.paymentAmount, 0);
  }, [amortizationSchedule]);

  const totalInterest = useMemo(() => {
    return amortizationSchedule.reduce((sum, row) => sum + row.interestPayment, 0);
  }, [amortizationSchedule]);

  // Pagination for amortization
  const totalPages = Math.ceil(amortizationSchedule.length / rowsPerPage);
  const startIndex = (amortizationPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, amortizationSchedule.length);
  const currentAmortizationRows = amortizationSchedule.slice(startIndex, endIndex);

  // Chart data
  const yearlyData = useMemo(() => {
    const rentBreakdown = results.renting.yearlyBreakdown;
    const buyBreakdown = results.buying.yearlyBreakdown;

    const aggregatedBuyBreakdown: number[] = [];
    const aggregatedRentBreakdown: number[] = [];
    let buySum = 0;
    let rentSum = 0;

    for (let i = 0; i < buyBreakdown.length; i++) {
      buySum += buyBreakdown[i];
      rentSum += rentBreakdown[i];
      aggregatedBuyBreakdown.push(buySum);
      aggregatedRentBreakdown.push(rentSum);
    }

    return new Array(values.yearsToStay).fill(0).map((_, index) => {
      let rentValue, buyValue;
      switch (viewMode) {
        case "regular":
          rentValue = Math.abs(rentBreakdown[index]);
          buyValue = buyBreakdown[index];
          break;
        case "cumulative":
          rentValue = Math.abs(aggregatedRentBreakdown[index]);
          buyValue = aggregatedBuyBreakdown[index];
          break;
        case "difference":
          if (index === 0) {
            rentValue = Math.abs(rentBreakdown[0]);
            buyValue = buyBreakdown[0];
          } else {
            rentValue = Math.abs(rentBreakdown[index]) - Math.abs(rentBreakdown[index - 1]);
            buyValue = Math.abs(buyBreakdown[index]) - Math.abs(buyBreakdown[index - 1]);
          }
          break;
      }
      return {
        date: `Year ${index + 1}`,
        [t("calculator.rent")]: rentValue,
        [t("calculator.results.buy")]: buyValue,
      };
    });
  }, [results, values.yearsToStay, t, viewMode]);

  const chartCategories = useMemo(() => {
    return [t("calculator.rent"), t("calculator.results.buy")];
  }, [t]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const tabs = [
    { id: "summary" as TabId, label: t("calculator.results.summary") || "Summary", icon: TrendingUp },
    { id: "chart" as TabId, label: t("calculator.results.chart") || "Chart", icon: BarChart3 },
    { id: "amortization" as TabId, label: t("calculator.amortization.short") || "Amortization", icon: Table2 },
  ];

  return (
    <div className="flex flex-col gap-4">
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-[var(--bg-elevated)] text-[var(--text-primary)] px-4 py-2 rounded shadow-lg border border-[var(--border-default)] font-mono text-sm z-50">
          {t("calculator.linkCopied")}
        </div>
      )}

      {/* Hero result - always visible */}
      <div className="card p-4 sm:p-6 glow-copper">
        <div className="text-center">
          <p className="stat-label mb-2">{t("calculator.results.savesYou")}</p>
          <h3 className="text-[var(--text-primary)] mb-2">
            <span className={`text-xl sm:text-2xl font-display italic ${isRentingBetter ? 'text-blueprint-400' : 'text-copper-400'}`}>
              {results.buying.totalCost > results.renting.totalCost
                ? t("calculator.results.renting")
                : t("calculator.results.buying")}
            </span>
          </h3>
          <p className="stat-value text-[var(--text-primary)]">
            {formatCurrency(Math.abs(savings), currency)}
          </p>
          <p className="text-[var(--text-muted)] text-sm mt-2 font-mono">
            {t("calculator.results.overYears", { years: values.yearsToStay })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="panel overflow-hidden">
        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab flex-1 flex items-center justify-center gap-2 ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {/* Summary Tab */}
          {activeTab === "summary" && (
            <div className="space-y-6">
              {/* Cost breakdown table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[300px]">
                  <thead>
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="stat-label text-left pb-3 pr-4">{t("calculator.results.costs")}</th>
                      <th className="stat-label text-right pb-3 px-2">{t("calculator.rent")}</th>
                      <th className="stat-label text-right pb-3 pl-2">{t("calculator.results.buy")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {[
                      [t("calculator.results.initialCosts"), results.renting.initialCost, results.buying.initialCost],
                      [t("calculator.results.recurringCosts"), results.renting.recurringCost, results.buying.recurringCost],
                      [t("calculator.results.opportunityCosts"), results.renting.opportunityCost, results.buying.opportunityCost],
                      [t("calculator.results.netProceeds"), results.renting.netProceeds, results.buying.netProceeds],
                    ].map(([label, rent, buy]) => (
                      <tr key={label as string}>
                        <td className="text-[var(--text-secondary)] text-sm py-3 pr-4">{label}</td>
                        <td className={`font-mono text-sm py-3 px-2 text-right tabular-nums ${(rent as number) > 0 ? "text-red-400" : "text-green-400"}`}>
                          {formatCurrency(rent as number, currency)}
                        </td>
                        <td className={`font-mono text-sm py-3 pl-2 text-right tabular-nums ${(buy as number) > 0 ? "text-red-400" : "text-green-400"}`}>
                          {formatCurrency(buy as number, currency)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[var(--bg-muted)]/30">
                      <td className="text-[var(--text-primary)] font-medium text-sm py-3 pr-4">{t("calculator.results.total")}</td>
                      <td className={`font-mono font-semibold py-3 px-2 text-right tabular-nums ${results.renting.totalCost > 0 ? "text-red-400" : "text-green-400"}`}>
                        {formatCurrency(results.renting.totalCost, currency)}
                      </td>
                      <td className={`font-mono font-semibold py-3 pl-2 text-right tabular-nums ${results.buying.totalCost > 0 ? "text-red-400" : "text-green-400"}`}>
                        {formatCurrency(results.buying.totalCost, currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Monthly breakdown */}
              <div className="pt-4 border-t border-[var(--border-default)]">
                <h4 className="stat-label mb-3 flex items-center">
                  {t("calculator.results.monthlyBreakdown")}
                  <Tooltip content={t("calculator.tooltips.monthlyPayment")} iconClassName="text-[var(--text-muted)]" />
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider mb-1">{t("calculator.rent")}</p>
                    <p className="font-mono text-base sm:text-lg text-red-400 tabular-nums">
                      {formatCurrency(results.renting.totalCost / (values.yearsToStay * 12), currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider mb-1">{t("calculator.results.buy")}</p>
                    <p className="font-mono text-base sm:text-lg text-red-400 tabular-nums">
                      {formatCurrency(results.buying.totalCost / (values.yearsToStay * 12), currency)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end pt-4 border-t border-[var(--border-default)] gap-2">
                <button onClick={handleShare} className="btn btn-ghost text-xs">{t("calculator.share")}</button>
                <button onClick={reset} className="btn btn-ghost text-xs">{t("calculator.reset")}</button>
              </div>
            </div>
          )}

          {/* Chart Tab */}
          {activeTab === "chart" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-[var(--text-primary)] font-medium text-sm uppercase tracking-wide">
                    {t("calculator.results.yearBreakdown")}
                  </h4>
                  <Tooltip content={t("calculator.tooltips.yearBreakdown")} iconClassName="text-[var(--text-muted)]" />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value as ViewMode)}
                    className="input py-1.5 px-3 text-sm w-auto"
                  >
                    <option value="regular">{t("calculator.results.regular")}</option>
                    <option value="cumulative">{t("calculator.results.runningTotal")}</option>
                    <option value="difference">{t("calculator.results.difference")}</option>
                  </select>
                  <Tooltip content={t("calculator.tooltips.viewMode")} iconClassName="text-[var(--text-muted)]" />
                </div>
              </div>
              <AreaChart
                className="w-full h-[280px] sm:h-[320px]"
                data={yearlyData}
                index="date"
                allowDecimals
                categories={chartCategories}
                yAxisWidth={70}
                colors={["light", "dark"]}
                fill="solid"
                valueFormatter={(value: number) => formatCurrency(value, currency)}
              />
            </div>
          )}

          {/* Amortization Tab */}
          {activeTab === "amortization" && (
            <div className="space-y-4">
              {/* Loan info header */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-[var(--text-muted)]">{t("calculator.amortization.loanAmount")}: </span>
                  <span className="font-mono text-copper-400">{formatCurrency(loanAmount, currency)}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">{t("calculator.amortization.term")}: </span>
                  <span className="font-mono text-copper-400">{values.mortgageTerm} {t("years")}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">{t("calculator.amortization.rate")}: </span>
                  <span className="font-mono text-copper-400">{(values.mortgageRate * 100).toFixed(2)}%</span>
                </div>
              </div>

              {/* Amortization table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="stat-label text-left pb-2 pr-2">#</th>
                      <th className="stat-label text-right pb-2 px-2">{t("calculator.amortization.payment_amount")}</th>
                      <th className="stat-label text-right pb-2 px-2">{t("calculator.amortization.principal")}</th>
                      <th className="stat-label text-right pb-2 px-2">{t("calculator.amortization.interest")}</th>
                      <th className="stat-label text-right pb-2 pl-2">{t("calculator.amortization.remaining")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {currentAmortizationRows.map((row) => (
                      <tr key={row.paymentNumber} className="hover:bg-[var(--bg-muted)]/20">
                        <td className="py-2 pr-2 text-[var(--text-muted)]">{row.paymentNumber}</td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                          {formatCurrency(row.paymentAmount, currency)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums text-green-400">
                          {formatCurrency(row.principalPayment, currency)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums text-red-400">
                          {formatCurrency(row.interestPayment, currency)}
                        </td>
                        <td className="py-2 pl-2 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                          {formatCurrency(row.remainingBalance, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">
                  {startIndex + 1} - {endIndex} of {amortizationSchedule.length}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setAmortizationPage(p => Math.max(1, p - 1))}
                    disabled={amortizationPage === 1}
                    className="btn btn-ghost p-2 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setAmortizationPage(p => Math.min(totalPages, p + 1))}
                    disabled={amortizationPage === totalPages}
                    className="btn btn-ghost p-2 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Loan summary */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--border-default)]">
                <div>
                  <p className="stat-label mb-1">{t("calculator.amortization.original_loan")}</p>
                  <p className="font-mono text-[var(--text-primary)] tabular-nums">{formatCurrency(loanAmount, currency)}</p>
                </div>
                <div>
                  <p className="stat-label mb-1">{t("calculator.amortization.total_interest")}</p>
                  <p className="font-mono text-red-400 tabular-nums">{formatCurrency(totalInterest, currency)}</p>
                </div>
                <div className="bg-copper-500/10 border border-copper-500/30 rounded p-2">
                  <p className="stat-label mb-1">{t("calculator.amortization.total_paid")}</p>
                  <p className="font-mono text-copper-400 font-semibold tabular-nums">{formatCurrency(totalAmortizationPaid, currency)}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {(totalAmortizationPaid / loanAmount).toFixed(2)}x
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default TabbedResults;
