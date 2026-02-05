import React, { useState, useMemo } from "react";
import { useCalculator, type CalculatorValues } from "../context/calculator-context";
import { createBuyingCalculator } from "../utils/country-buy-calculator";
import { createRentingCalculator } from "../utils/country-rent-calculator";
import { calculateAmortizationSchedule } from "../utils/amortization";
import { formatCurrency } from "../utils/format-currency";
import { useTranslation } from "react-i18next";
import { useAppContext } from "../context/app-context";
import type { CountryCode } from "../constants/country-rules";
import { AreaChart } from "./area-chart";
import Tooltip from "./tooltip";
import { BarChart3, Table2, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";

type TabId = "summary" | "chart" | "amortization";
type ViewMode = "regular" | "cumulative" | "difference" | "equity";

// ============================================================================
// Advanced computation helpers
// ============================================================================

/**
 * Find the break-even year: the first year where cumulative buying cost
 * drops below cumulative renting cost. Returns null if buying never
 * becomes cheaper within the analysis period.
 */
function findBreakEvenYear(
  buyYearly: number[],
  rentYearly: number[]
): number | null {
  let buyCumulative = 0;
  let rentCumulative = 0;

  for (let i = 0; i < buyYearly.length; i++) {
    buyCumulative += buyYearly[i];
    rentCumulative += rentYearly[i];

    if (buyCumulative <= rentCumulative) {
      return i + 1; // 1-indexed year
    }
  }

  return null;
}

/**
 * Build wealth-accumulation data: home equity vs. renter's investment portfolio.
 * 
 * Home equity = current home value - remaining loan balance
 * Renter portfolio = cumulative (buy_cost - rent_cost) invested at returns rate
 */
function buildEquityData(
  values: CalculatorValues,
  country: CountryCode,
  yearsToStay: number
): { year: number; homeEquity: number; portfolio: number }[] {
  const data: { year: number; homeEquity: number; portfolio: number }[] = [];

  const loanAmount = values.homePrice * (1 - values.downPayment);
  const monthlyRate = values.mortgageRate / 12;
  const totalMonths = values.mortgageTerm * 12;
  const monthlyPayment =
    monthlyRate > 0
      ? (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalMonths))
      : loanAmount / totalMonths;

  let remainingBalance = loanAmount;
  const effectiveReturn = values.investmentReturn * (1 - 0.15); // after-tax
  let portfolio = values.homePrice * values.downPayment; // down payment into portfolio
  // Add buying closing costs to portfolio (renter keeps this)
  portfolio += values.homePrice * values.buyingCosts;

  for (let year = 1; year <= yearsToStay; year++) {
    // Home equity
    const homeValue = values.homePrice * Math.pow(1 + values.homePriceGrowth, year);

    // Pay down mortgage for 12 months
    for (let m = 0; m < 12; m++) {
      if (remainingBalance <= 0) break;
      const interest = remainingBalance * monthlyRate;
      const principal = Math.min(monthlyPayment - interest, remainingBalance);
      remainingBalance -= principal;
    }

    const homeEquity = homeValue - Math.max(0, remainingBalance);

    // Renter portfolio: grows at effective return rate
    // Renter invests the difference between buying costs and renting costs per year
    const rentCost = values.monthlyRent * 12 * Math.pow(1 + values.rentGrowth, year - 1);
    const buyCost =
      monthlyPayment * 12 +
      homeValue * (values.propertyTaxRate + values.homeInsuranceRate + values.maintenanceRate) +
      values.extraPayments * 12;

    const surplus = buyCost - rentCost;

    // Portfolio grows, then surplus is added
    portfolio = portfolio * (1 + effectiveReturn) + Math.max(0, surplus);

    data.push({ year, homeEquity, portfolio });
  }

  return data;
}

/**
 * Sensitivity analysis: compute how total buying cost changes when a key
 * parameter is shifted by ± delta.
 */
function computeSensitivity(
  country: CountryCode,
  baseValues: CalculatorValues,
  baseBuyingCost: number,
  baseRentingCost: number,
): {
  parameter: string;
  key: keyof CalculatorValues;
  lowLabel: string;
  highLabel: string;
  // Positive = favours buying, Negative = favours renting
  lowImpact: number;
  highImpact: number;
}[] {
  const params: {
    key: keyof CalculatorValues;
    label: string;
    delta: number;
    format: (v: number) => string;
  }[] = [
    { key: "mortgageRate", label: "Mortgage Rate", delta: 0.01, format: (v) => `${(v * 100).toFixed(1)}%` },
    { key: "homePriceGrowth", label: "Home Price Growth", delta: 0.01, format: (v) => `${(v * 100).toFixed(1)}%` },
    { key: "investmentReturn", label: "Investment Return", delta: 0.01, format: (v) => `${(v * 100).toFixed(1)}%` },
    { key: "yearsToStay", label: "Years to Stay", delta: 2, format: (v) => `${v}yr` },
  ];

  const baseDiff = baseBuyingCost - baseRentingCost; // positive = renting wins

  return params.map(({ key, label, delta, format }) => {
    const lowVal = (baseValues[key] as number) - delta;
    const highVal = (baseValues[key] as number) + delta;

    const lowValues = { ...baseValues, [key]: lowVal };
    const highValues = { ...baseValues, [key]: highVal };

    const lowBuy = createBuyingCalculator(country, lowValues).calculate().totalCost;
    const lowRent = createRentingCalculator(country, lowValues).calculate().totalCost;
    const lowDiff = lowBuy - lowRent;

    const highBuy = createBuyingCalculator(country, highValues).calculate().totalCost;
    const highRent = createRentingCalculator(country, highValues).calculate().totalCost;
    const highDiff = highBuy - highRent;

    return {
      parameter: label,
      key,
      lowLabel: format(lowVal),
      highLabel: format(highVal),
      lowImpact: baseDiff - lowDiff,  // positive = low value helps buying
      highImpact: baseDiff - highDiff, // positive = high value helps buying
    };
  });
}

const TabbedResults = React.memo(() => {
  const { t } = useTranslation();
  const { values, reset } = useCalculator();
  const { currency, country } = useAppContext();
  const [showToast, setShowToast] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [viewMode, setViewMode] = useState<ViewMode>("cumulative");
  const [amortizationPage, setAmortizationPage] = useState(1);
  const rowsPerPage = 12;

  const results = useMemo(() => {
    // Use country-aware calculators
    const buyingCalculator = createBuyingCalculator(country, values);
    const rentingCalculator = createRentingCalculator(country, values);
    return {
      buying: buyingCalculator.calculate(),
      renting: rentingCalculator.calculate(),
    };
  }, [values, country]);

  const savings = useMemo(() => {
    return Math.abs(results.buying.totalCost) - Math.abs(results.renting.totalCost);
  }, [results]);

  const isRentingBetter = results.renting.totalCost < results.buying.totalCost;

  // ---- Advanced computations ----

  // Break-even year
  const breakEvenYear = useMemo(
    () => findBreakEvenYear(results.buying.yearlyBreakdown, results.renting.yearlyBreakdown),
    [results]
  );

  // Rental yield / cap rate
  const rentalYield = useMemo(
    () => (values.monthlyRent * 12) / values.homePrice,
    [values.monthlyRent, values.homePrice]
  );

  // Equity vs portfolio (for chart view)
  const equityData = useMemo(
    () => buildEquityData(values, country, values.yearsToStay),
    [values, country]
  );

  // Sensitivity
  const sensitivity = useMemo(
    () => computeSensitivity(country, values, results.buying.totalCost, results.renting.totalCost),
    [country, values, results]
  );

  // Inflation-adjusted toggle
  const [showReal, setShowReal] = useState(false);

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
    // Equity view mode uses different data structure
    if (viewMode === "equity") {
      return equityData.map((d) => {
        const discount = showReal ? Math.pow(1 + values.inflationRate, d.year) : 1;
        return {
          date: `Year ${d.year}`,
          [t("calculator.results.homeEquity") || "Home Equity"]: d.homeEquity / discount,
          [t("calculator.results.renterPortfolio") || "Renter Portfolio"]: d.portfolio / discount,
        };
      });
    }

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

    return Array.from({ length: values.yearsToStay }, (_, index) => {
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

      // Inflation adjustment
      if (showReal) {
        const discount = Math.pow(1 + values.inflationRate, index + 1);
        rentValue = rentValue / discount;
        buyValue = buyValue / discount;
      }

      return {
        date: `Year ${index + 1}`,
        [t("calculator.rent")]: rentValue,
        [t("calculator.results.buy")]: buyValue,
      };
    });
  }, [results, values, equityData, t, viewMode, showReal]);

  const chartCategories = useMemo(() => {
    if (viewMode === "equity") {
      return [
        t("calculator.results.homeEquity") || "Home Equity",
        t("calculator.results.renterPortfolio") || "Renter Portfolio",
      ];
    }
    return [t("calculator.rent"), t("calculator.results.buy")];
  }, [t, viewMode]);

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
      <div className="card p-4 sm:p-6 glow-copper" data-testid="results-hero">
        <div className="text-center">
          <p className="stat-label mb-2" data-testid="results-label">{t("calculator.results.savesYou")}</p>
          <h3 className="text-[var(--text-primary)] mb-2">
            <span className={`text-xl sm:text-2xl font-display italic ${isRentingBetter ? 'text-blueprint-400' : 'text-copper-400'}`} data-testid="results-winner">
              {results.buying.totalCost > results.renting.totalCost
                ? t("calculator.results.renting")
                : t("calculator.results.buying")}
            </span>
          </h3>
          <p className="stat-value text-[var(--text-primary)]" data-testid="results-savings">
            {formatCurrency(Math.abs(savings), currency)}
          </p>
          <p className="text-[var(--text-muted)] text-sm mt-2 font-mono">
            {t("calculator.results.overYears", { years: values.yearsToStay })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="panel overflow-hidden" data-testid="results-panel">
        <div className="tabs" data-testid="results-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab flex-1 flex items-center justify-center gap-2 ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
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
                      <td className="text-[var(--text-primary)] font-medium text-sm py-3 pr-4 rounded-l">{t("calculator.results.total")}</td>
                      <td className={`font-mono font-semibold text-sm py-3 px-2 text-right tabular-nums ${results.renting.totalCost > 0 ? "text-red-400" : "text-green-400"}`}>
                        {formatCurrency(results.renting.totalCost, currency)}
                      </td>
                      <td className={`font-mono font-semibold text-sm py-3 pl-2 text-right tabular-nums rounded-r ${results.buying.totalCost > 0 ? "text-red-400" : "text-green-400"}`}>
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

              {/* Advanced Metrics */}
              <div className="pt-4 border-t border-[var(--border-default)] space-y-3">
                <h4 className="stat-label">
                  {t("calculator.results.advancedMetrics") || "Advanced Metrics"}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {/* Break-even */}
                  <div className="p-3 rounded bg-[var(--bg-muted)]/30">
                    <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider mb-1">
                      {t("calculator.results.breakEven") || "Break-even"}
                    </p>
                    <p className="font-mono text-sm text-[var(--text-primary)] tabular-nums">
                      {breakEvenYear
                        ? `${t("calculator.results.year") || "Year"} ${breakEvenYear}`
                        : `>${values.yearsToStay} ${t("years")}`}
                    </p>
                  </div>
                  {/* Rental yield */}
                  <div className="p-3 rounded bg-[var(--bg-muted)]/30">
                    <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider mb-1">
                      {t("calculator.results.rentalYield") || "Rental Yield"}
                    </p>
                    <p className="font-mono text-sm text-[var(--text-primary)] tabular-nums">
                      {(rentalYield * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Sensitivity Analysis */}
              <div className="pt-4 border-t border-[var(--border-default)] space-y-3">
                <h4 className="stat-label">
                  {t("calculator.results.sensitivity") || "Sensitivity"}
                </h4>
                <div className="space-y-2">
                  {sensitivity.map((s) => {
                    const maxAbsImpact = Math.max(
                      ...sensitivity.map((x) => Math.max(Math.abs(x.lowImpact), Math.abs(x.highImpact)))
                    );
                    const lowBarWidth = maxAbsImpact > 0 ? Math.abs(s.lowImpact) / maxAbsImpact * 100 : 0;
                    const highBarWidth = maxAbsImpact > 0 ? Math.abs(s.highImpact) / maxAbsImpact * 100 : 0;

                    return (
                      <div key={s.key} className="text-xs">
                        <div className="flex justify-between text-[var(--text-muted)] mb-1">
                          <span>{s.lowLabel}</span>
                          <span className="text-[var(--text-secondary)] font-medium">{s.parameter}</span>
                          <span>{s.highLabel}</span>
                        </div>
                        <div className="flex items-center h-4 gap-0">
                          {/* Left bar (low value impact) */}
                          <div className="flex-1 flex justify-end">
                            <div
                              className={`h-3 rounded-l ${s.lowImpact > 0 ? "bg-green-500/60" : "bg-red-500/60"}`}
                              style={{ width: `${Math.min(lowBarWidth, 100)}%` }}
                            />
                          </div>
                          <div className="w-px h-4 bg-[var(--border-default)]" />
                          {/* Right bar (high value impact) */}
                          <div className="flex-1">
                            <div
                              className={`h-3 rounded-r ${s.highImpact > 0 ? "bg-green-500/60" : "bg-red-500/60"}`}
                              style={{ width: `${Math.min(highBarWidth, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    {t("calculator.results.sensitivityHint") || "Green favours buying, red favours renting."}
                  </p>
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
                    <option value="equity">{t("calculator.results.equity") || "Equity vs Portfolio"}</option>
                  </select>
                  <Tooltip content={t("calculator.tooltips.viewMode")} iconClassName="text-[var(--text-muted)]" />
                  <button
                    onClick={() => setShowReal((v) => !v)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      showReal
                        ? "bg-copper-500/20 border-copper-500/40 text-copper-400"
                        : "border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    }`}
                    title={t("calculator.results.realToggleHint") || "Toggle inflation-adjusted (real) values"}
                  >
                    {showReal
                      ? (t("calculator.results.real") || "Real")
                      : (t("calculator.results.nominal") || "Nominal")}
                  </button>
                </div>
              </div>
              <div data-testid="chart-container">
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

// Track re-renders in development
if (import.meta.env.DEV) {
  TabbedResults.whyDidYouRender = true;
}

export default TabbedResults;
