import { memo, useCallback } from "react";
import { clsx } from "clsx";

export type FilterType = "all" | "sale" | "rent";

interface FilterPillsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const pillBase =
  "px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors focus:outline-none first:rounded-l-md last:rounded-r-md";

/**
 * Segmented control for switching between All/Buy/Rent views
 */
export const FilterPills = memo(function FilterPills({
  activeFilter,
  onFilterChange,
}: FilterPillsProps) {
  const handleAllClick = useCallback(() => onFilterChange("all"), [onFilterChange]);
  const handleSaleClick = useCallback(() => onFilterChange("sale"), [onFilterChange]);
  const handleRentClick = useCallback(() => onFilterChange("rent"), [onFilterChange]);

  const getStyle = (filter: FilterType) => {
    const isActive = activeFilter === filter;
    if (isActive) {
      const colors = {
        all: "bg-copper-600 text-white",
        sale: "bg-emerald-600 text-white",
        rent: "bg-blueprint-500 text-white",
      };
      return colors[filter];
    }
    return "";
  };

  const inactiveStyle = {
    color: "var(--text-muted)",
  };

  return (
    <div
      className="inline-flex items-stretch rounded-md border overflow-hidden"
      style={{
        borderColor: "var(--border-default)",
        background: "var(--bg-elevated)",
      }}
      role="tablist"
    >
      <button
        role="tab"
        aria-selected={activeFilter === "all"}
        onClick={handleAllClick}
        className={clsx(pillBase, getStyle("all"))}
        style={activeFilter !== "all" ? inactiveStyle : undefined}
      >
        All
      </button>
      <div className="w-px" style={{ background: "var(--border-default)" }} />
      <button
        role="tab"
        aria-selected={activeFilter === "sale"}
        onClick={handleSaleClick}
        className={clsx(pillBase, getStyle("sale"))}
        style={activeFilter !== "sale" ? inactiveStyle : undefined}
      >
        Buy
      </button>
      <div className="w-px" style={{ background: "var(--border-default)" }} />
      <button
        role="tab"
        aria-selected={activeFilter === "rent"}
        onClick={handleRentClick}
        className={clsx(pillBase, getStyle("rent"))}
        style={activeFilter !== "rent" ? inactiveStyle : undefined}
      >
        Rent
      </button>
    </div>
  );
});
