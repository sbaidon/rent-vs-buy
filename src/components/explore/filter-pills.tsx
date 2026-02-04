import { memo, useCallback } from "react";
import { clsx } from "clsx";
import { Home, Building2 } from "lucide-react";

export type FilterType = "all" | "sale" | "rent";

interface FilterPillsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

// Hoist static styles outside component (Vercel best practice: rendering-hoist-jsx)
const baseStyles =
  "px-3 sm:px-4 py-1.5 sm:py-2 rounded text-xs font-medium uppercase tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-copper-500/50 focus:ring-offset-2";

/**
 * Filter pills for switching between All/Buy/Rent views
 * Memoized to prevent re-renders when unrelated parent state changes
 */
export const FilterPills = memo(function FilterPills({
  activeFilter,
  onFilterChange,
}: FilterPillsProps) {
  // Use callbacks to prevent function recreation
  const handleAllClick = useCallback(() => onFilterChange("all"), [onFilterChange]);
  const handleSaleClick = useCallback(() => onFilterChange("sale"), [onFilterChange]);
  const handleRentClick = useCallback(() => onFilterChange("rent"), [onFilterChange]);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2" role="tablist">
      <button
        role="tab"
        aria-selected={activeFilter === "all"}
        onClick={handleAllClick}
        className={clsx(
          baseStyles,
          activeFilter === "all"
            ? "bg-copper-600 text-white shadow-lg shadow-copper-500/20 border border-copper-500"
            : "border"
        )}
        style={activeFilter !== "all" ? {
          background: "var(--bg-elevated)",
          borderColor: "var(--border-default)",
          color: "var(--text-secondary)",
        } : undefined}
      >
        All
      </button>
      <button
        role="tab"
        aria-selected={activeFilter === "sale"}
        onClick={handleSaleClick}
        className={clsx(
          baseStyles,
          "flex items-center gap-1.5 sm:gap-2",
          activeFilter === "sale"
            ? "bg-green-600 text-white shadow-lg shadow-green-500/20 border border-green-500"
            : "border"
        )}
        style={activeFilter !== "sale" ? {
          background: "var(--bg-elevated)",
          borderColor: "var(--border-default)",
          color: "var(--text-secondary)",
        } : undefined}
      >
        <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        Buy
      </button>
      <button
        role="tab"
        aria-selected={activeFilter === "rent"}
        onClick={handleRentClick}
        className={clsx(
          baseStyles,
          "flex items-center gap-1.5 sm:gap-2",
          activeFilter === "rent"
            ? "bg-blueprint-500 text-white shadow-lg shadow-blueprint-500/20 border border-blueprint-400"
            : "border"
        )}
        style={activeFilter !== "rent" ? {
          background: "var(--bg-elevated)",
          borderColor: "var(--border-default)",
          color: "var(--text-secondary)",
        } : undefined}
      >
        <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        Rent
      </button>
    </div>
  );
});
