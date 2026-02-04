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
  "px-4 py-2 rounded-full text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2";

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
    <div className="flex items-center gap-2" role="tablist">
      <button
        role="tab"
        aria-selected={activeFilter === "all"}
        onClick={handleAllClick}
        className={clsx(
          baseStyles,
          activeFilter === "all"
            ? "bg-slate-900 text-white shadow-sm"
            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
        )}
      >
        All
      </button>
      <button
        role="tab"
        aria-selected={activeFilter === "sale"}
        onClick={handleSaleClick}
        className={clsx(
          baseStyles,
          "flex items-center gap-2",
          activeFilter === "sale"
            ? "bg-emerald-500 text-white shadow-sm"
            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
        )}
      >
        <Home className="w-4 h-4" />
        Buy
      </button>
      <button
        role="tab"
        aria-selected={activeFilter === "rent"}
        onClick={handleRentClick}
        className={clsx(
          baseStyles,
          "flex items-center gap-2",
          activeFilter === "rent"
            ? "bg-sky-500 text-white shadow-sm"
            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
        )}
      >
        <Building2 className="w-4 h-4" />
        Rent
      </button>
    </div>
  );
});
