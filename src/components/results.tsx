import React from "react";
import { useCalculator } from "../context/calculator-context";
import { createBuyingCalculator } from "../utils/country-buy-calculator";
import { createRentingCalculator } from "../utils/country-rent-calculator";
import { formatCurrency } from "../utils/format-currency";
import { useTranslation } from "react-i18next";
import { useAppContext } from "../context/app-context";
import { AreaChart } from "./area-chart";
import Tooltip from "./tooltip";

// Define view mode type for the chart
type ViewMode = "regular" | "cumulative" | "difference";

const Results = React.memo(() => {
  const { t } = useTranslation();
  const { values, reset } = useCalculator();
  const { currency, country } = useAppContext();
  const [showToast, setShowToast] = React.useState(false);

  // Replace separate toggles with a single view mode state
  const [viewMode, setViewMode] = React.useState<ViewMode>("cumulative");

  const results = React.useMemo(() => {
    // Use country-aware calculators
    const buyingCalculator = createBuyingCalculator(country, values);
    const rentingCalculator = createRentingCalculator(country, values);

    const buying = buyingCalculator.calculate();
    const renting = rentingCalculator.calculate();

    return {
      buying,
      renting,
    };
  }, [values, country]);

  const savings = React.useMemo(() => {
    return (
      Math.abs(results.buying.totalCost) - Math.abs(results.renting.totalCost)
    );
  }, [results]);

  const isRentingBetter = results.renting.totalCost < results.buying.totalCost;

  const yearlyData = React.useMemo(() => {
    const rentBreakdown = results.renting.yearlyBreakdown;
    const buyBreakdown = results.buying.yearlyBreakdown;

    // Create an array with cumulative sums from buyBreakdown and rentBreakdown
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

    return Array.from({ length: values.yearsToStay }, (_, index) => {
      let rentValue, buyValue;

      switch (viewMode) {
        case "regular":
          // Regular yearly values
          rentValue = Math.abs(rentBreakdown[index]);
          buyValue = buyBreakdown[index];
          break;

        case "cumulative":
          // Cumulative values
          rentValue = Math.abs(aggregatedRentBreakdown[index]);
          buyValue = aggregatedBuyBreakdown[index];
          break;

        case "difference":
          // Year-over-year difference
          if (index === 0) {
            // First year is just the regular value
            rentValue = Math.abs(rentBreakdown[0]);
            buyValue = buyBreakdown[0];
          } else {
            // Subsequent years show the difference from previous year
            rentValue =
              Math.abs(rentBreakdown[index]) -
              Math.abs(rentBreakdown[index - 1]);
            buyValue =
              Math.abs(buyBreakdown[index]) - Math.abs(buyBreakdown[index - 1]);
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

  // Calculate chart categories based on view mode
  const chartCategories = React.useMemo(() => {
    return [t("calculator.rent"), t("calculator.results.buy")];
  }, [t]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div className="p-4 sm:p-8 lg:p-0 mx-auto max-w-[600px] lg:max-w-full flex flex-col gap-6 items-center">
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-[var(--bg-elevated)] text-[var(--text-primary)] px-4 py-2 rounded shadow-lg transition-opacity z-0 isolate border border-[var(--border-default)] font-mono text-sm">
          {t("calculator.linkCopied")}
        </div>
      )}
      
      {/* Main results card with copper accent */}
      <div className="card max-h-[900px] p-4 sm:p-6 w-full glow-copper">
        {/* Hero result section */}
        <div className="p-4 sm:p-6 mb-6 text-center border-b border-[var(--border-default)]">
          <p className="stat-label mb-2">{t("calculator.results.savesYou")}</p>
          <h3 className="text-[var(--text-primary)] mb-3">
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

        {/* Cost breakdown table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[320px]">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="stat-label text-left pb-3 pr-4">{t("calculator.results.costs")}</th>
                <th className="stat-label text-right pb-3 px-2">{t("calculator.rent")}</th>
                <th className="stat-label text-right pb-3 pl-2">{t("calculator.results.buy")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {[
                [
                  t("calculator.results.initialCosts"),
                  results.renting.initialCost,
                  results.buying.initialCost,
                ],
                [
                  t("calculator.results.recurringCosts"),
                  results.renting.recurringCost,
                  results.buying.recurringCost,
                ],
                [
                  t("calculator.results.opportunityCosts"),
                  results.renting.opportunityCost,
                  results.buying.opportunityCost,
                ],
                [
                  t("calculator.results.netProceeds"),
                  results.renting.netProceeds,
                  results.buying.netProceeds,
                ],
              ].map(([label, rent, buy]) => (
                <tr key={label as string}>
                  <td className="text-[var(--text-secondary)] text-sm py-3 pr-4">{label}</td>
                  <td
                    className={`font-mono text-sm py-3 px-2 text-right tabular-nums ${
                      (rent as number) > 0 ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {formatCurrency(rent as number, currency)}
                  </td>
                  <td
                    className={`font-mono text-sm py-3 pl-2 text-right tabular-nums ${
                      (buy as number) > 0 ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {formatCurrency(buy as number, currency)}
                  </td>
                </tr>
              ))}
              <tr className="bg-[var(--bg-muted)]/30">
                <td className="text-[var(--text-primary)] font-medium text-sm py-3 pr-4">{t("calculator.results.total")}</td>
                <td
                  className={`font-mono font-semibold py-3 px-2 text-right tabular-nums ${
                    results.renting.totalCost > 0
                      ? "text-red-400"
                      : "text-green-400"
                  }`}
                >
                  {formatCurrency(results.renting.totalCost, currency)}
                </td>
                <td
                  className={`font-mono font-semibold py-3 pl-2 text-right tabular-nums ${
                    results.buying.totalCost > 0
                      ? "text-red-400"
                      : "text-green-400"
                  }`}
                >
                  {formatCurrency(results.buying.totalCost, currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Monthly breakdown */}
        <div className="mt-6 pt-4 border-t border-[var(--border-default)]">
          <h4 className="stat-label mb-3 flex items-center">
            {t("calculator.results.monthlyBreakdown")}
            <Tooltip
              content={t("calculator.tooltips.monthlyPayment")}
              iconClassName="text-[var(--text-muted)]"
            />
          </h4>
          <div className="w-full">
            <div className="grid grid-cols-2 text-left mb-2 gap-4">
              <div className="text-[var(--text-muted)] text-xs uppercase tracking-wider">{t("calculator.rent")}</div>
              <div className="text-[var(--text-muted)] text-xs uppercase tracking-wider">{t("calculator.results.buy")}</div>
            </div>
            <div className="border-t border-[var(--border-default)]">
              <div className="grid grid-cols-2 py-3 gap-4">
                <div className="font-mono text-base sm:text-lg text-red-400 tabular-nums">
                  {formatCurrency(
                    results.renting.totalCost / (values.yearsToStay * 12),
                    currency
                  )}
                </div>
                <div className="font-mono text-base sm:text-lg text-red-400 tabular-nums">
                  {formatCurrency(
                    results.buying.totalCost / (values.yearsToStay * 12),
                    currency
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end mt-6 pt-4 border-t border-[var(--border-default)] gap-2">
          <button
            onClick={handleShare}
            className="btn btn-ghost text-xs"
          >
            {t("calculator.share")}
          </button>
          <button
            onClick={reset}
            className="btn btn-ghost text-xs"
          >
            {t("calculator.reset")}
          </button>
        </div>
      </div>
      
      {/* Chart section */}
      <div className="max-h-[500px] w-full panel p-4 sm:p-6">
        <div className="flex-col sm:flex-row gap-4 sm:gap-0 flex justify-between items-start sm:items-center mb-4">
          <div className="flex items-center gap-2">
            <h4 className="text-[var(--text-primary)] font-medium text-sm uppercase tracking-wide">
              {t("calculator.results.yearBreakdown")}
            </h4>
            <Tooltip
              content={t("calculator.tooltips.yearBreakdown")}
              iconClassName="text-[var(--text-muted)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              id="view-mode-select"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="input py-1.5 px-3 text-sm w-auto"
            >
              <option value="regular">{t("calculator.results.regular")}</option>
              <option value="cumulative">
                {t("calculator.results.runningTotal")}
              </option>
              <option value="difference">
                {t("calculator.results.difference")}
              </option>
            </select>
            <Tooltip
              content={t("calculator.tooltips.viewMode")}
              iconClassName="text-[var(--text-muted)]"
            />
          </div>
        </div>
        <AreaChart
          className="w-full h-[300px] sm:h-[350px]"
          data={yearlyData}
          index="date"
          allowDecimals
          categories={chartCategories}
          yAxisWidth={80}
          colors={["light", "dark"]}
          fill="solid"
          valueFormatter={(value) => formatCurrency(value, currency)}
        />
      </div>
    </div>
  );
});

export default Results;
