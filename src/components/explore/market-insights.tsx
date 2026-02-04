import { memo } from "react";
import { TrendingUp, X } from "lucide-react";
import { Card } from "../ui/card";

interface MarketInsightsProps {
  isOpen: boolean;
  onClose: () => void;
  location?: string;
}

/**
 * Market insights panel showing area statistics
 * Memoized to prevent re-renders when map state changes
 */
export const MarketInsights = memo(function MarketInsights({
  isOpen,
  onClose,
  location = "Austin, TX",
}: MarketInsightsProps) {
  // Early return for closed state (Vercel best practice: js-early-exit)
  if (!isOpen) return null;

  return (
    <Card className="absolute top-4 right-4 w-80 z-10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-sky-500" />
          Market Insights
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close insights panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-sm text-slate-500 mb-4">{location}</p>

      <div className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Median Home Price" value="$485,000" change="+3.2%" />
          <StatCard label="Median Rent" value="$1,850/mo" change="+4.5%" />
        </div>

        {/* Price to Rent Ratio */}
        <div className="bg-gradient-to-r from-sky-50 to-sky-100/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              Price-to-Rent Ratio
            </span>
            <span className="text-lg font-bold text-sky-700">21.8</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Higher than national average (19.2). Renting may be more
            cost-effective for shorter stays.
          </p>
        </div>

        {/* Additional Stats */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <StatRow label="30-Year Fixed Rate" value="6.89%" />
          <StatRow label="Days on Market" value="45 days" />
          <StatRow label="Active Listings" value="1,250" />
        </div>
      </div>
    </Card>
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
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
      <p
        className={`text-xs font-medium ${
          isPositive ? "text-emerald-600" : "text-rose-600"
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
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
});
