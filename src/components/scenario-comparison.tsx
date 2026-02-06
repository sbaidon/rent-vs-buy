/**
 * Scenario comparison panel.
 *
 * Shows saved scenarios side by side in a table, highlighting the best
 * option for each metric. Accessible as a dialog.
 */

import React from "react";
import { X, Trash2, Crown } from "lucide-react";
import { formatCurrency } from "../utils/format-currency";
import { useAppContext } from "../context/app-context";
import { useTranslation } from "react-i18next";
import type { SavedScenario } from "../hooks/use-scenarios";

interface ScenarioComparisonProps {
  scenarios: SavedScenario[];
  isOpen: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({
  scenarios,
  isOpen,
  onClose,
  onRemove,
  onClear,
}) => {
  const { currency } = useAppContext();
  const { t } = useTranslation();

  if (!isOpen || scenarios.length === 0) return null;

  const fmt = (v: number) => formatCurrency(v, currency);

  // Determine best (lowest total cost) scenario
  const totalCosts = scenarios.map((s) =>
    Math.min(s.results.buying.totalCost, s.results.renting.totalCost)
  );
  const bestIdx = totalCosts.indexOf(Math.min(...totalCosts));

  const rows: { label: string; values: (s: SavedScenario) => string; best: "low" | "high" | "none" }[] = [
    {
      label: t("calculator.sections.basics.homePrice"),
      values: (s) => fmt(s.values.homePrice),
      best: "none",
    },
    {
      label: t("calculator.sections.basics.monthlyRent"),
      values: (s) => fmt(s.values.monthlyRent),
      best: "none",
    },
    {
      label: t("calculator.sections.mortgage.rate"),
      values: (s) => `${(s.values.mortgageRate * 100).toFixed(2)}%`,
      best: "none",
    },
    {
      label: t("calculator.results.buying") + " " + t("calculator.results.total"),
      values: (s) => fmt(s.results.buying.totalCost),
      best: "low",
    },
    {
      label: t("calculator.results.renting") + " " + t("calculator.results.total"),
      values: (s) => fmt(s.results.renting.totalCost),
      best: "low",
    },
    {
      label: t("calculator.results.savesYou"),
      values: (s) => {
        const diff = Math.abs(s.results.buying.totalCost - s.results.renting.totalCost);
        const winner = s.results.buying.totalCost < s.results.renting.totalCost
          ? t("calculator.results.buying")
          : t("calculator.results.renting");
        return `${winner} ${fmt(diff)}`;
      },
      best: "none",
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Compare scenarios"
        className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[90vw] sm:max-w-3xl sm:max-h-[80vh] z-50 overflow-auto rounded-lg"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-[var(--border-default)]" style={{ background: "var(--bg-surface)" }}>
          <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--text-primary)]">
            Compare Scenarios
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onClear}
              className="btn btn-ghost text-xs text-red-400 hover:text-red-300"
              aria-label="Clear all scenarios"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              Clear All
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Close comparison"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="p-4 overflow-x-auto">
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="stat-label text-left pb-3 pr-4 w-40" />
                {scenarios.map((s, i) => (
                  <th key={s.id} className="stat-label text-right pb-3 px-2 relative">
                    <div className="flex items-center justify-end gap-2">
                      {i === bestIdx && (
                        <Crown className="w-3.5 h-3.5 text-copper-400" aria-label="Best scenario" />
                      )}
                      <span className="text-[var(--text-primary)] font-medium text-xs truncate max-w-[120px]">
                        {s.name}
                      </span>
                      <button
                        onClick={() => onRemove(s.id)}
                        className="p-0.5 rounded hover:bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-red-400 transition-colors"
                        aria-label={`Remove ${s.name}`}
                      >
                        <X className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                    <span className="text-[var(--text-muted)] text-[10px] font-normal block mt-0.5">
                      {s.country} · {new Date(s.savedAt).toLocaleDateString()}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {rows.map((row) => {
                const cellValues = scenarios.map((s) => row.values(s));
                // Find best cell for "low" comparison
                let bestCellIdx = -1;
                if (row.best === "low" && scenarios.length > 1) {
                  const nums = scenarios.map((s) => {
                    const txt = row.values(s).replace(/[^0-9.-]/g, "");
                    return parseFloat(txt);
                  });
                  const valid = nums.filter((n) => !isNaN(n));
                  if (valid.length > 0) {
                    const best = Math.min(...valid);
                    bestCellIdx = nums.indexOf(best);
                  }
                }

                return (
                  <tr key={row.label}>
                    <td className="text-[var(--text-secondary)] text-sm py-3 pr-4">
                      {row.label}
                    </td>
                    {cellValues.map((val, i) => (
                      <td
                        key={scenarios[i].id}
                        className={`font-mono text-sm py-3 px-2 text-right tabular-nums ${
                          i === bestCellIdx
                            ? "text-green-400 font-semibold"
                            : "text-[var(--text-primary)]"
                        }`}
                      >
                        {val}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ScenarioComparison;
