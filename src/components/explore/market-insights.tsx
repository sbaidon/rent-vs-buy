import { memo } from "react";
import { TrendingUp, X, ChevronDown } from "lucide-react";
import { clsx } from "clsx";

interface MarketInsightsProps {
  isOpen: boolean;
  onClose: () => void;
  location?: string;
}

/**
 * Market insights panel showing area statistics
 * Mobile: slides up from bottom
 * Desktop: positioned at top-right
 * Memoized to prevent re-renders when map state changes
 */
export const MarketInsights = memo(function MarketInsights({
  isOpen,
  onClose,
  location = "Austin, TX",
}: MarketInsightsProps) {
  // No useEffect needed - CSS handles animations via isOpen prop directly
  // Early return for closed state (Vercel best practice: js-early-exit)
  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div 
        className={clsx(
          "fixed inset-0 bg-black/50 z-20 sm:hidden transition-opacity duration-300",
          "opacity-100" // Always visible when isOpen is true
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Panel */}
      <div 
        className={clsx(
          // Mobile: bottom sheet
          "fixed bottom-0 left-0 right-0 z-30 rounded-t-2xl max-h-[70vh] overflow-y-auto",
          // Desktop: top-right panel
          "sm:absolute sm:bottom-auto sm:top-4 sm:right-4 sm:left-auto sm:w-80 sm:rounded-lg sm:max-h-none",
          // Transitions
          "transition-transform duration-300 ease-out",
          // Animations handled by CSS - always visible when rendered
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
              <TrendingUp className="w-5 h-5 text-copper-400" />
              Market Insights
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-muted)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
              aria-label="Close insights panel"
            >
              <X className="w-4 h-4 hidden sm:block" />
              <ChevronDown className="w-5 h-5 sm:hidden" />
            </button>
          </div>

          <p 
            className="text-sm mb-4 font-mono"
            style={{ color: "var(--text-muted)" }}
          >
            {location}
          </p>

          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Median Home Price" value="$485,000" change="+3.2%" />
              <StatCard label="Median Rent" value="$1,850/mo" change="+4.5%" />
            </div>

            {/* Price to Rent Ratio */}
            <div 
              className="rounded-lg p-3 sm:p-4"
              style={{ 
                background: "rgba(224, 107, 71, 0.1)",
                border: "1px solid rgba(224, 107, 71, 0.3)"
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span 
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Price-to-Rent Ratio
                </span>
                <span className="text-lg font-mono font-bold text-copper-400">21.8</span>
              </div>
              <p 
                className="text-xs leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                Higher than national average (19.2). Renting may be more
                cost-effective for shorter stays.
              </p>
            </div>

            {/* Additional Stats */}
            <div 
              className="pt-3 space-y-2"
              style={{ borderTop: "1px solid var(--border-default)" }}
            >
              <StatRow label="30-Year Fixed Rate" value="6.89%" />
              <StatRow label="Days on Market" value="45 days" />
              <StatRow label="Active Listings" value="1,250" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

// Extracted memoized sub-components for better performance
const StatCard = memo(function StatCard({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: string;
}) {
  const isPositive = change.startsWith("+");
  
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
      <p
        className={`text-xs font-mono font-medium ${
          isPositive ? "text-green-400" : "text-red-400"
        }`}
      >
        {change} YoY
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
