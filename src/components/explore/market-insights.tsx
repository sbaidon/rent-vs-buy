import { memo } from "react";
import { TrendingUp, X, ChevronDown, Home, Building2 } from "lucide-react";
import { clsx } from "clsx";
import type { MarketStats } from "../../context/explore-context";

interface MarketInsightsProps {
  isOpen: boolean;
  onClose: () => void;
  location?: string;
  stats: MarketStats;
  isLoading?: boolean;
}

/**
 * Derives a 0-100 index score from the price-to-rent ratio.
 *
 * Scale anchors (based on global real-estate norms):
 *   ratio  5  → score 100  (strongly favours buying)
 *   ratio 15  → score  50  (neutral)
 *   ratio 30+ → score   0  (strongly favours renting)
 *
 * Linear interpolation between anchors, clamped [0, 100].
 * Higher score = buying is more attractive.
 */
function ratioToScore(ratio: number): number {
  // Map ratio → score with two linear segments
  let score: number;
  if (ratio <= 15) {
    // 5→100, 15→50
    score = 100 - ((ratio - 5) / 10) * 50;
  } else {
    // 15→50, 30→0
    score = 50 - ((ratio - 15) / 15) * 50;
  }
  return Math.round(Math.max(0, Math.min(100, score)));
}

type Verdict = {
  label: string;
  detail: string;
  color: string;          // Tailwind text class
  accentBg: string;       // for the score badge background
};

function getVerdict(score: number): Verdict {
  if (score >= 70) return {
    label: "Buy",
    detail: "Buying is likely more cost-effective in this area.",
    color: "text-emerald-400",
    accentBg: "bg-emerald-500/20",
  };
  if (score >= 55) return {
    label: "Lean Buy",
    detail: "Buying has a slight edge, but consider your timeline.",
    color: "text-emerald-300",
    accentBg: "bg-emerald-500/15",
  };
  if (score >= 45) return {
    label: "Neutral",
    detail: "Either option is reasonable — your timeline is the deciding factor.",
    color: "text-amber-400",
    accentBg: "bg-amber-500/20",
  };
  if (score >= 30) return {
    label: "Lean Rent",
    detail: "Renting has a slight edge, especially for shorter stays.",
    color: "text-blueprint-300",
    accentBg: "bg-blueprint-500/15",
  };
  return {
    label: "Rent",
    detail: "Renting is likely more cost-effective in this area.",
    color: "text-blueprint-400",
    accentBg: "bg-blueprint-500/20",
  };
}

/**
 * Market insights panel showing area statistics derived from property listings.
 * Mobile: slides up from bottom
 * Desktop: positioned at top-right
 * Memoized to prevent re-renders when map state changes
 */
export const MarketInsights = memo(function MarketInsights({
  isOpen,
  onClose,
  location = "Austin, TX",
  stats,
  isLoading = false,
}: MarketInsightsProps) {
  if (!isOpen) return null;

  const formatPrice = (value: number | null): string => {
    if (value == null) return "—";
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
    return `$${Math.round(value)}`;
  };

  const formatRent = (value: number | null): string => {
    if (value == null) return "—";
    return `$${value.toLocaleString()}/mo`;
  };

  const hasData = stats.medianHomePrice != null || stats.medianRent != null;

  const score = stats.priceToRentRatio != null ? ratioToScore(stats.priceToRentRatio) : null;
  const verdict = score != null ? getVerdict(score) : null;

  return (
    <>
      {/* Mobile backdrop */}
      <div 
        className={clsx(
          "fixed inset-0 bg-black/50 z-20 sm:hidden transition-opacity duration-300",
          "opacity-100"
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Panel */}
      <div 
        role="region"
        aria-label="Market insights"
        className={clsx(
          "fixed bottom-0 left-0 right-0 z-30 rounded-t-2xl max-h-[70vh] overflow-y-auto",
          "sm:absolute sm:bottom-auto sm:top-4 sm:right-4 sm:left-auto sm:w-80 sm:rounded-lg sm:max-h-none",
          "transition-transform duration-300 ease-out",
          "translate-y-0",
          "sm:opacity-100"
        )}
        style={{ 
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.3)"
        }}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div 
            className="w-10 h-1 rounded-full"
            style={{ background: "var(--border-default)" }}
          />
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 
              className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wide"
              style={{ color: "var(--text-primary)" }}
            >
              <TrendingUp className="w-5 h-5 text-copper-400" aria-hidden="true" />
              Market Insights
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full transition-colors hover:bg-[var(--bg-muted)]"
              style={{ color: "var(--text-muted)" }}
              aria-label="Close insights panel"
            >
              <X className="w-4 h-4 hidden sm:block" aria-hidden="true" />
              <ChevronDown className="w-5 h-5 sm:hidden" aria-hidden="true" />
            </button>
          </div>

          <p 
            className="text-sm mb-4 font-mono"
            style={{ color: "var(--text-muted)" }}
          >
            {location}
          </p>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg p-3 animate-pulse" style={{ background: "var(--bg-surface)" }}>
                  <div className="h-3 w-20 rounded" style={{ background: "var(--bg-muted)" }} />
                  <div className="h-5 w-24 rounded mt-2" style={{ background: "var(--bg-muted)" }} />
                </div>
              ))}
            </div>
          ) : !hasData ? (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No property data available for this area.
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Try searching for a different location.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* ── Rent vs Buy Index ── */}
              {score != null && verdict != null && (
                <div
                  className="rounded-lg p-3 sm:p-4"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                  }}
                  role="figure"
                  aria-label={`Rent vs Buy index: ${score} out of 100, verdict ${verdict.label}`}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-xs font-medium uppercase tracking-wide"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Rent vs Buy Index
                    </span>
                    <span className={clsx("text-sm font-mono font-bold px-2 py-0.5 rounded", verdict.accentBg, verdict.color)}>
                      {verdict.label}
                    </span>
                  </div>

                  {/* Gauge */}
                  <div className="relative mb-2">
                    {/* Track */}
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "var(--bg-muted)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: "100%",
                          background: "linear-gradient(to right, #38bdf8, #38bdf8 30%, #fbbf24 45%, #fbbf24 55%, #34d399 70%, #34d399)",
                        }}
                      />
                    </div>
                    {/* Needle */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md"
                      style={{
                        left: `calc(${score}% - 7px)`,
                        background: score >= 55 ? "#34d399" : score >= 45 ? "#fbbf24" : "#38bdf8",
                        transition: "left 0.4s ease-out",
                      }}
                      aria-hidden="true"
                    />
                  </div>

                  {/* Labels under gauge */}
                  <div className="flex justify-between text-[10px] mb-3" style={{ color: "var(--text-muted)" }}>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" aria-hidden="true" />
                      Rent
                    </span>
                    <span className="flex items-center gap-1">
                      Buy
                      <Home className="w-3 h-3" aria-hidden="true" />
                    </span>
                  </div>

                  {/* Score + ratio */}
                  <div className="flex items-baseline justify-between mb-2">
                    <span className={clsx("text-2xl font-mono font-bold tabular-nums", verdict.color)}>
                      {score}
                      <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>/100</span>
                    </span>
                    {stats.priceToRentRatio != null && (
                      <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                        P/R ratio: {stats.priceToRentRatio}
                      </span>
                    )}
                  </div>

                  {/* Explanation */}
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {verdict.detail}
                  </p>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Median Home Price" value={formatPrice(stats.medianHomePrice)} />
                <StatCard label="Median Rent" value={formatRent(stats.medianRent)} />
              </div>

              {/* Additional Stats */}
              <div 
                className="pt-3 space-y-2"
                style={{ borderTop: "1px solid var(--border-default)" }}
              >
                {stats.daysOnMarket != null && (
                  <StatRow label="Days on Market" value={`${stats.daysOnMarket} days`} />
                )}
                <StatRow label="Active Listings" value={stats.inventoryCount.toLocaleString()} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
});

const StatCard = memo(function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div 
      className="rounded-lg p-3"
      style={{ 
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)"
      }}
    >
      <p 
        className="text-xs mb-1 uppercase tracking-wide"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <p 
        className="text-base sm:text-lg font-mono font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </p>
    </div>
  );
});

const StatRow = memo(function StatRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span 
        className="text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </span>
      <span 
        className="text-sm font-mono font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
});
