import { memo, useCallback, useState } from "react";
import { X, RotateCcw } from "lucide-react";
import { Button } from "../ui/button";

export interface FilterValues {
  priceMin?: number;
  priceMax?: number;
  bedsMin?: number;
  bedsMax?: number;
  bathsMin?: number;
  sqftMin?: number;
  sqftMax?: number;
  propertyTypes: string[];
}

export const defaultFilters: FilterValues = {
  priceMin: undefined,
  priceMax: undefined,
  bedsMin: undefined,
  bedsMax: undefined,
  bathsMin: undefined,
  sqftMin: undefined,
  sqftMax: undefined,
  propertyTypes: [],
};

interface FiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  onApply: (filters: FilterValues) => void;
  activeFilterType: "all" | "sale" | "rent";
}

// Price presets based on filter type
const PRICE_PRESETS = {
  sale: [
    { label: "Any", min: undefined, max: undefined },
    { label: "Under $300K", min: undefined, max: 300000 },
    { label: "$300K - $500K", min: 300000, max: 500000 },
    { label: "$500K - $750K", min: 500000, max: 750000 },
    { label: "$750K - $1M", min: 750000, max: 1000000 },
    { label: "$1M+", min: 1000000, max: undefined },
  ],
  rent: [
    { label: "Any", min: undefined, max: undefined },
    { label: "Under $1,500", min: undefined, max: 1500 },
    { label: "$1,500 - $2,500", min: 1500, max: 2500 },
    { label: "$2,500 - $3,500", min: 2500, max: 3500 },
    { label: "$3,500 - $5,000", min: 3500, max: 5000 },
    { label: "$5,000+", min: 5000, max: undefined },
  ],
  all: [
    { label: "Any", min: undefined, max: undefined },
  ],
};

const BEDROOM_OPTIONS = [
  { label: "Any", value: undefined },
  { label: "1+", value: 1 },
  { label: "2+", value: 2 },
  { label: "3+", value: 3 },
  { label: "4+", value: 4 },
  { label: "5+", value: 5 },
];

const BATHROOM_OPTIONS = [
  { label: "Any", value: undefined },
  { label: "1+", value: 1 },
  { label: "2+", value: 2 },
  { label: "3+", value: 3 },
  { label: "4+", value: 4 },
];

const SQFT_PRESETS = [
  { label: "Any", min: undefined, max: undefined },
  { label: "Under 1,000", min: undefined, max: 1000 },
  { label: "1,000 - 1,500", min: 1000, max: 1500 },
  { label: "1,500 - 2,000", min: 1500, max: 2000 },
  { label: "2,000 - 3,000", min: 2000, max: 3000 },
  { label: "3,000+", min: 3000, max: undefined },
];

const PROPERTY_TYPES = [
  { label: "Single Family", value: "single_family" },
  { label: "Condo", value: "condo" },
  { label: "Townhome", value: "townhome" },
  { label: "Multi Family", value: "multi_family" },
  { label: "Land", value: "land" },
  { label: "Mobile", value: "mobile" },
];

/**
 * Filters panel that slides in from the right
 * Contains all search filter options
 */
export const FiltersPanel = memo(function FiltersPanel({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onApply,
  activeFilterType,
}: FiltersPanelProps) {
  const [localFilters, setLocalFilters] = useState<FilterValues>(filters);

  // Update local filters when prop changes
  const updateFilter = useCallback(
    <K extends keyof FilterValues>(key: K, value: FilterValues[K]) => {
      setLocalFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handlePricePreset = useCallback(
    (min: number | undefined, max: number | undefined) => {
      setLocalFilters((prev) => ({
        ...prev,
        priceMin: min,
        priceMax: max,
      }));
    },
    []
  );

  const handleSqftPreset = useCallback(
    (min: number | undefined, max: number | undefined) => {
      setLocalFilters((prev) => ({
        ...prev,
        sqftMin: min,
        sqftMax: max,
      }));
    },
    []
  );

  const handlePropertyTypeToggle = useCallback((type: string) => {
    setLocalFilters((prev) => {
      const types = prev.propertyTypes.includes(type)
        ? prev.propertyTypes.filter((t) => t !== type)
        : [...prev.propertyTypes, type];
      return { ...prev, propertyTypes: types };
    });
  }, []);

  const handleReset = useCallback(() => {
    setLocalFilters(defaultFilters);
  }, []);

  const handleApply = useCallback(() => {
    onApply(localFilters);
    onClose();
  }, [localFilters, onApply, onClose]);

  // Count active filters
  const activeFilterCount = [
    localFilters.priceMin !== undefined || localFilters.priceMax !== undefined,
    localFilters.bedsMin !== undefined,
    localFilters.bathsMin !== undefined,
    localFilters.sqftMin !== undefined || localFilters.sqftMax !== undefined,
    localFilters.propertyTypes.length > 0,
  ].filter(Boolean).length;

  const showBothPriceGroups = activeFilterType === "all";
  const pricePresets = showBothPriceGroups
    ? PRICE_PRESETS.all
    : activeFilterType === "rent"
      ? PRICE_PRESETS.rent
      : PRICE_PRESETS.sale;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        data-view-transition-name="filters-backdrop"
        onClick={onClose}
        style={{ viewTransitionName: "filters-backdrop" }}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-full sm:w-96 z-50 flex flex-col animate-slide-in-right"
        data-view-transition-name="filters-panel"
        style={{
          background: "var(--bg-surface)",
          borderLeft: "1px solid var(--border-default)",
          viewTransitionName: "filters-panel",
        }}
      >
        {/* Header - with safe area padding for mobile notch/island */}
        <div
          className="flex items-center justify-between px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] border-b"
          style={{ borderColor: "var(--border-default)" }}
        >
          <div className="flex items-center gap-3">
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Filters
            </h2>
            {activeFilterCount > 0 && (
              <span
                className="px-2 py-0.5 text-xs font-mono rounded-full"
                style={{
                  background: "var(--color-copper-500)",
                  color: "white",
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)" }}
              title="Reset filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-3 -mr-2 rounded-full transition-colors hover:bg-[var(--bg-muted)]"
              style={{ color: "var(--text-muted)" }}
              aria-label="Close filters"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Price Range */}
          <FilterSection title="Price Range">
            {showBothPriceGroups ? (
              <>
                {/* "Any" preset */}
                <div className="mb-3">
                  <PresetButton
                    label="Any"
                    isActive={localFilters.priceMin === undefined && localFilters.priceMax === undefined}
                    onClick={() => handlePricePreset(undefined, undefined)}
                  />
                </div>
                {/* Sale presets */}
                <p className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: "var(--text-muted)" }}>
                  For Sale
                </p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {PRICE_PRESETS.sale.slice(1).map((preset) => (
                    <PresetButton
                      key={preset.label}
                      label={preset.label}
                      isActive={localFilters.priceMin === preset.min && localFilters.priceMax === preset.max}
                      onClick={() => handlePricePreset(preset.min, preset.max)}
                    />
                  ))}
                </div>
                {/* Rent presets */}
                <p className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: "var(--text-muted)" }}>
                  For Rent
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {PRICE_PRESETS.rent.slice(1).map((preset) => (
                    <PresetButton
                      key={preset.label}
                      label={preset.label}
                      isActive={localFilters.priceMin === preset.min && localFilters.priceMax === preset.max}
                      onClick={() => handlePricePreset(preset.min, preset.max)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {pricePresets.map((preset) => (
                  <PresetButton
                    key={preset.label}
                    label={preset.label}
                    isActive={localFilters.priceMin === preset.min && localFilters.priceMax === preset.max}
                    onClick={() => handlePricePreset(preset.min, preset.max)}
                  />
                ))}
              </div>
            )}
            {/* Custom inputs */}
            <div className="flex items-center gap-2 mt-3">
              <input
                type="number"
                placeholder="Min"
                value={localFilters.priceMin ?? ""}
                onChange={(e) =>
                  updateFilter(
                    "priceMin",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="input py-2 text-sm"
              />
              <span style={{ color: "var(--text-muted)" }}>-</span>
              <input
                type="number"
                placeholder="Max"
                value={localFilters.priceMax ?? ""}
                onChange={(e) =>
                  updateFilter(
                    "priceMax",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="input py-2 text-sm"
              />
            </div>
          </FilterSection>

          {/* Bedrooms */}
          <FilterSection title="Bedrooms">
            <div className="flex flex-wrap gap-2">
              {BEDROOM_OPTIONS.map((option) => (
                <PresetButton
                  key={option.label}
                  label={option.label}
                  isActive={localFilters.bedsMin === option.value}
                  onClick={() => updateFilter("bedsMin", option.value)}
                />
              ))}
            </div>
          </FilterSection>

          {/* Bathrooms */}
          <FilterSection title="Bathrooms">
            <div className="flex flex-wrap gap-2">
              {BATHROOM_OPTIONS.map((option) => (
                <PresetButton
                  key={option.label}
                  label={option.label}
                  isActive={localFilters.bathsMin === option.value}
                  onClick={() => updateFilter("bathsMin", option.value)}
                />
              ))}
            </div>
          </FilterSection>

          {/* Square Footage */}
          <FilterSection title="Square Footage">
            <div className="grid grid-cols-3 gap-2">
              {SQFT_PRESETS.map((preset) => (
                <PresetButton
                  key={preset.label}
                  label={preset.label}
                  isActive={
                    localFilters.sqftMin === preset.min &&
                    localFilters.sqftMax === preset.max
                  }
                  onClick={() => handleSqftPreset(preset.min, preset.max)}
                />
              ))}
            </div>
          </FilterSection>

          {/* Property Type */}
          <FilterSection title="Property Type">
            <div className="grid grid-cols-2 gap-2">
              {PROPERTY_TYPES.map((type) => (
                <PresetButton
                  key={type.value}
                  label={type.label}
                  isActive={localFilters.propertyTypes.includes(type.value)}
                  onClick={() => handlePropertyTypeToggle(type.value)}
                />
              ))}
            </div>
          </FilterSection>
        </div>

        {/* Footer */}
        <div
          className="px-4 py-4 border-t"
          style={{ borderColor: "var(--border-default)" }}
        >
          <Button onClick={handleApply} className="w-full">
            Apply Filters
          </Button>
        </div>
      </div>
    </>
  );
});

// Helper components
interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
}

const FilterSection = memo(function FilterSection({
  title,
  children,
}: FilterSectionProps) {
  return (
    <div>
      <h3
        className="text-sm font-medium uppercase tracking-wide mb-3"
        style={{ color: "var(--text-muted)" }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
});

interface PresetButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const PresetButton = memo(function PresetButton({
  label,
  isActive,
  onClick,
}: PresetButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 text-xs font-medium rounded-lg transition-all"
      style={
        isActive
          ? {
              background: "var(--color-copper-500)",
              color: "white",
            }
          : {
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }
      }
    >
      {label}
    </button>
  );
});
