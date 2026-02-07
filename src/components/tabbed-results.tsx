import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useCalculator } from "../context/calculator-context";
import { createBuyingCalculator } from "../utils/country-buy-calculator";
import { createRentingCalculator } from "../utils/country-rent-calculator";
import { calculateAmortizationSchedule } from "../utils/amortization";
import { formatCurrency, formatCurrencyCompact } from "../utils/format-currency";
import { findBreakEvenYear, buildEquityData, computeSensitivity } from "../utils/results-helpers";
import { useTranslation } from "react-i18next";
import { useAppContext } from "../context/app-context";
import { AreaChart } from "./area-chart";
import Tooltip from "./tooltip";
import { BarChart3, Table2, TrendingUp, ChevronLeft, ChevronRight, Save, GitCompareArrows, Home, Building2, X, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useScenarios } from "../hooks/use-scenarios";
import ScenarioComparison from "./scenario-comparison";
import { Link } from "@tanstack/react-router";

// ============================================================================
// Comparison context from Explore page
// ============================================================================

interface ComparisonListing {
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  homeType?: string;
}

interface ComparisonContext {
  buy: ComparisonListing;
  rent: ComparisonListing;
}

function useComparisonContext() {
  const [context, setContext] = useState<ComparisonContext | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("rvb-comparison");
      if (stored) setContext(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const dismiss = useCallback(() => {
    setContext(null);
    try {
      sessionStorage.removeItem("rvb-comparison");
    } catch {
      // ignore
    }
  }, []);

  return { context, dismiss };
}

function ComparisonBanner({
  context,
  onDismiss,
  currency,
}: {
  context: ComparisonContext;
  onDismiss: () => void;
  currency: string;
}) {
  const formatPrice = (price: number, type: "buy" | "rent") => {
    if (type === "rent") return `${formatCurrency(price, currency)}/mo`;
    if (price >= 1_000_000) return `${formatCurrency(price, currency)}`;
    return formatCurrency(price, currency);
  };

  return (
    <div
      className="rounded-lg border text-sm overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-default)",
      }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "var(--border-default)" }}>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-copper-400" aria-hidden="true" />
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Comparing from Explore
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/explore"
            className="text-[11px] font-medium text-copper-400 hover:text-copper-300 transition-colors px-1.5 py-0.5 rounded hover:bg-copper-500/10"
          >
            Back to map
          </Link>
          <button
            onClick={onDismiss}
            className="p-0.5 rounded transition-colors hover:bg-[var(--bg-muted)]"
            style={{ color: "var(--text-muted)" }}
            aria-label="Dismiss comparison context"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x" style={{ borderColor: "var(--border-default)" }}>
        {/* Buy listing */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-1 mb-1">
            <Home className="w-3 h-3 text-emerald-400" aria-hidden="true" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-400">Buy</span>
          </div>
          <p className="font-mono font-medium text-xs truncate" style={{ color: "var(--text-primary)" }}>
            {formatPrice(context.buy.price, "buy")}
          </p>
          <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
            {context.buy.address}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {context.buy.bedrooms || "—"}bd / {context.buy.bathrooms || "—"}ba
            {context.buy.sqft ? ` / ${context.buy.sqft.toLocaleString()} sqft` : ""}
          </p>
        </div>
        {/* Rent listing */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-1 mb-1">
            <Building2 className="w-3 h-3 text-blueprint-400" aria-hidden="true" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-blueprint-400">Rent</span>
          </div>
          <p className="font-mono font-medium text-xs truncate" style={{ color: "var(--text-primary)" }}>
            {formatPrice(context.rent.price, "rent")}
          </p>
          <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
            {context.rent.address}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {context.rent.bedrooms || "—"}bd / {context.rent.bathrooms || "—"}ba
            {context.rent.sqft ? ` / ${context.rent.sqft.toLocaleString()} sqft` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

type TabId = "summary" | "chart" | "amortization";
type ViewMode = "regular" | "cumulative" | "difference" | "equity";

const TabbedResults = React.memo(() => {
  const { t } = useTranslation();
  const { values, reset } = useCalculator();
  const { currency, country } = useAppContext();
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [viewMode, setViewMode] = useState<ViewMode>("cumulative");
  const [amortizationPage, setAmortizationPage] = useState(1);
  const rowsPerPage = 12;

  // Comparison context from Explore page
  const { context: comparisonContext, dismiss: dismissComparison } = useComparisonContext();

  // Scenario management
  const {
    scenarios,
    showComparison,
    canSave,
    saveScenario,
    removeScenario,
    clearScenarios,
    openComparison,
    closeComparison,
  } = useScenarios();

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
    navigator.clipboard.writeText(window.location.href).then(
      () => toast.success(t("calculator.linkCopied")),
      () => toast.error(t("calculator.linkCopyFailed") || "Failed to copy link"),
    );
  };

  const handleSaveScenario = () => {
    if (!canSave) {
      toast.error(t("calculator.scenarios.maxReached") || "Maximum 3 scenarios. Remove one first.");
      return;
    }
    const name = window.prompt(
      t("calculator.scenarios.namePrompt") || "Name this scenario:",
      `${formatCurrency(values.homePrice, currency)} / ${formatCurrency(values.monthlyRent, currency)}`
    );
    if (!name) return;
    const saved = saveScenario(name, values, country, results);
    if (saved) {
      toast.success(t("calculator.scenarios.saved") || `"${name}" saved`);
    }
  };

  const tabs = [
    { id: "summary" as TabId, label: t("calculator.results.summary") || "Summary", icon: TrendingUp },
    { id: "chart" as TabId, label: t("calculator.results.chart") || "Chart", icon: BarChart3 },
    { id: "amortization" as TabId, label: t("calculator.amortization.short") || "Amortization", icon: Table2 },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Comparison context banner from Explore page */}
      {comparisonContext && (
        <ComparisonBanner
          context={comparisonContext}
          onDismiss={dismissComparison}
          currency={currency}
        />
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
        <div className="tabs" role="tablist" aria-label={t("calculator.results.title")} data-testid="results-tabs"
          onKeyDown={(e) => {
            const tabIds = tabs.map(tab => tab.id);
            const currentIndex = tabIds.indexOf(activeTab);
            let newIndex = currentIndex;
            if (e.key === "ArrowRight") newIndex = (currentIndex + 1) % tabIds.length;
            else if (e.key === "ArrowLeft") newIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
            else if (e.key === "Home") newIndex = 0;
            else if (e.key === "End") newIndex = tabIds.length - 1;
            else return;
            e.preventDefault();
            setActiveTab(tabIds[newIndex]);
            (e.currentTarget.children[newIndex] as HTMLElement)?.focus();
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              aria-label={tab.label}
              className={`tab flex-1 flex items-center justify-center gap-2 ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6" role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} tabIndex={0}>
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
                          {(rent as number) > 0 ? "" : "-"}{formatCurrency(Math.abs(rent as number), currency)}
                        </td>
                        <td className={`font-mono text-sm py-3 pl-2 text-right tabular-nums ${(buy as number) > 0 ? "text-red-400" : "text-green-400"}`}>
                          {(buy as number) > 0 ? "" : "-"}{formatCurrency(Math.abs(buy as number), currency)}
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
                      <div key={s.key} className="text-xs" role="group" aria-label={s.parameter}>
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
                              aria-hidden="true"
                            />
                          </div>
                          <div className="w-px h-4 bg-[var(--border-default)]" aria-hidden="true" />
                          {/* Right bar (high value impact) */}
                          <div className="flex-1">
                            <div
                              className={`h-3 rounded-r ${s.highImpact > 0 ? "bg-green-500/60" : "bg-red-500/60"}`}
                              style={{ width: `${Math.min(highBarWidth, 100)}%` }}
                              aria-hidden="true"
                            />
                          </div>
                        </div>
                        <span className="sr-only">
                          {s.lowLabel}: {s.lowImpact > 0 ? "favours buying" : "favours renting"} by {formatCurrency(Math.abs(s.lowImpact), currency)}.
                          {s.highLabel}: {s.highImpact > 0 ? "favours buying" : "favours renting"} by {formatCurrency(Math.abs(s.highImpact), currency)}.
                        </span>
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    {t("calculator.results.sensitivityHint") || "Green favours buying, red favours renting."}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap justify-end pt-4 border-t border-[var(--border-default)] gap-2">
                <button
                  onClick={handleSaveScenario}
                  className="btn btn-ghost text-xs"
                  aria-label={t("calculator.scenarios.save") || "Save scenario"}
                >
                  <Save className="w-3.5 h-3.5" aria-hidden="true" />
                  {t("calculator.scenarios.save") || "Save"}
                  {!canSave && <span className="text-[var(--text-muted)] ml-1">(3/3)</span>}
                </button>
                {scenarios.length > 0 && (
                  <button
                    onClick={openComparison}
                    className="btn btn-ghost text-xs"
                    aria-label={t("calculator.scenarios.compare") || "Compare scenarios"}
                  >
                    <GitCompareArrows className="w-3.5 h-3.5" aria-hidden="true" />
                    {t("calculator.scenarios.compare") || "Compare"} ({scenarios.length})
                  </button>
                )}
                <button onClick={handleShare} className="btn btn-ghost text-xs">{t("calculator.share")}</button>
                <button onClick={reset} className="btn btn-ghost text-xs">{t("calculator.reset")}</button>
              </div>
            </div>
          )}

          {/* Chart Tab */}
          {activeTab === "chart" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-[var(--text-primary)] font-medium text-sm uppercase tracking-wide mr-auto flex items-center gap-1.5">
                  {t("calculator.results.yearBreakdown")}
                  <Tooltip content={t("calculator.tooltips.yearBreakdown")} iconClassName="text-[var(--text-muted)]" />
                </h4>
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as ViewMode)}
                  className="input py-1 px-2 text-xs w-auto"
                  aria-label={t("calculator.results.viewMode")}
                >
                  <option value="regular">{t("calculator.results.regular")}</option>
                  <option value="cumulative">{t("calculator.results.runningTotal")}</option>
                  <option value="difference">{t("calculator.results.difference")}</option>
                  <option value="equity">{t("calculator.results.equity") || "Equity vs Portfolio"}</option>
                </select>
                <button
                  onClick={() => setShowReal((v) => !v)}
                  aria-pressed={showReal}
                  aria-label={t("calculator.results.realToggleHint") || "Toggle inflation-adjusted (real) values"}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    showReal
                      ? "bg-copper-500/20 border-copper-500/40 text-copper-400"
                      : "border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  {showReal
                    ? (t("calculator.results.real") || "Real")
                    : (t("calculator.results.nominal") || "Nominal")}
                </button>
              </div>
              <div data-testid="chart-container">
                <AreaChart
                  className="w-full h-[280px] sm:h-[320px]"
                  data={yearlyData}
                  index="date"
                  allowDecimals={false}
                  categories={chartCategories}
                  yAxisWidth={56}
                  colors={["light", "dark"]}
                  fill="gradient"
                  valueFormatter={(value: number) => formatCurrencyCompact(value, currency)}
                  customTooltip={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-md border text-sm shadow-lg border-[var(--border-default)] bg-[var(--bg-elevated)]">
                        <div className="border-b border-inherit px-3 py-1.5">
                          <p className="font-medium text-[var(--text-primary)]">{label}</p>
                        </div>
                        <div className="space-y-1 px-3 py-2">
                          {payload.map(({ value, category, color }, i) => (
                            <div key={i} className="flex items-center justify-between gap-6">
                              <div className="flex items-center gap-2">
                                <span
                                  aria-hidden="true"
                                  className={`h-[3px] w-3 shrink-0 rounded-full ${
                                    color === "light" ? "bg-blueprint-400" : "bg-copper-500"
                                  }`}
                                />
                                <span className="text-[var(--text-muted)]">{category}</span>
                              </div>
                              <span className="font-mono font-medium tabular-nums text-[var(--text-primary)]">
                                {formatCurrency(value, currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }}
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
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setAmortizationPage(p => Math.min(totalPages, p + 1))}
                    disabled={amortizationPage === totalPages}
                    className="btn btn-ghost p-2 disabled:opacity-30"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
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

      {/* Scenario comparison dialog */}
      <ScenarioComparison
        scenarios={scenarios}
        isOpen={showComparison}
        onClose={closeComparison}
        onRemove={removeScenario}
        onClear={clearScenarios}
      />
    </div>
  );
});

// Track re-renders in development
if (import.meta.env.DEV) {
  TabbedResults.whyDidYouRender = true;
}

export default TabbedResults;
