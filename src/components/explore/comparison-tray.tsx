import { memo, useCallback } from "react";
import { Home, Building2, X, ArrowRight, Sparkles, Bed, Bath, Maximize, Calendar } from "lucide-react";
import { Button } from "../ui/button";
import type { Property } from "./property-card";

export interface ComparisonSelection {
  buy: Property | null;
  rent: Property | null;
}

interface ComparisonTrayProps {
  selection: ComparisonSelection;
  onRemove: (type: "buy" | "rent") => void;
  onCompare: () => void;
  isVisible: boolean;
}

/**
 * Floating tray that shows selected Buy and Rent properties
 * Appears at bottom of screen when user starts selecting properties
 * Uses CSS view-transition-name for smooth entry/exit animations
 */
export const ComparisonTray = memo(function ComparisonTray({
  selection,
  onRemove,
  onCompare,
  isVisible,
}: ComparisonTrayProps) {
  const hasSelection = selection.buy || selection.rent;
  const canCompare = selection.buy && selection.rent;

  const handleRemoveBuy = useCallback(() => onRemove("buy"), [onRemove]);
  const handleRemoveRent = useCallback(() => onRemove("rent"), [onRemove]);

  if (!isVisible || !hasSelection) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe animate-slide-up"
      data-view-transition-name="comparison-tray"
      style={{
        background: "linear-gradient(to top, var(--bg-surface) 80%, transparent)",
        viewTransitionName: "comparison-tray",
      }}
    >
      <div
        className="max-w-3xl mx-auto rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-copper-400" />
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Compare Properties
            </span>
          </div>
          {canCompare && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-mono"
              style={{
                background: "var(--color-copper-500)",
                color: "white",
              }}
            >
              Ready to compare!
            </span>
          )}
        </div>

        {/* Selection slots */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Buy slot */}
          <PropertySlot
            type="buy"
            property={selection.buy}
            onRemove={handleRemoveBuy}
          />

          {/* Rent slot */}
          <PropertySlot
            type="rent"
            property={selection.rent}
            onRemove={handleRemoveRent}
          />
        </div>

        {/* Compare button */}
        <div className="px-4 pb-4">
          <Button
            onClick={onCompare}
            disabled={!canCompare}
            className="w-full group"
            size="md"
          >
            {canCompare ? (
              <>
                Run Comparison
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            ) : (
              <>Select {!selection.buy ? "a property to Buy" : "a property to Rent"}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
});

interface PropertySlotProps {
  type: "buy" | "rent";
  property: Property | null;
  onRemove: () => void;
}

const PropertySlot = memo(function PropertySlot({
  type,
  property,
  onRemove,
}: PropertySlotProps) {
  const isBuy = type === "buy";
  const Icon = isBuy ? Home : Building2;
  const accentColor = isBuy ? "#22c55e" : "#38bdf8";
  const bgColor = isBuy
    ? "rgba(34, 197, 94, 0.1)"
    : "rgba(56, 189, 248, 0.1)";
  const borderColor = isBuy
    ? "rgba(34, 197, 94, 0.3)"
    : "rgba(56, 189, 248, 0.3)";

  // Empty state
  if (!property) {
    return (
      <div
        className="rounded-lg p-4 border-2 border-dashed flex flex-col items-center justify-center text-center min-h-[120px]"
        style={{
          borderColor: "var(--border-default)",
          background: "var(--bg-surface)",
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
          style={{
            background: bgColor,
            border: `1px solid ${borderColor}`,
          }}
        >
          <Icon className="w-6 h-6" style={{ color: accentColor, opacity: 0.5 }} />
        </div>
        <p
          className="text-xs font-medium uppercase tracking-wide mb-1"
          style={{ color: "var(--text-muted)" }}
        >
          {isBuy ? "Buy Property" : "Rent Property"}
        </p>
        <p
          className="text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          Click a {isBuy ? "green" : "blue"} marker on the map
        </p>
      </div>
    );
  }

  // Filled state with property details
  return (
    <div
      className="rounded-lg p-3 relative group"
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
      }}
    >
      {/* Header with icon and price */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: accentColor }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-medium uppercase tracking-wide mb-0.5"
            style={{ color: "var(--text-muted)" }}
          >
            {isBuy ? "Buy" : "Rent"}
          </p>
          <p
            className="text-lg font-mono font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            ${property.price.toLocaleString()}
            {!isBuy && <span className="text-sm" style={{ color: "var(--text-muted)" }}>/mo</span>}
          </p>
        </div>
      </div>

      {/* Address */}
      <p
        className="text-sm mb-2 truncate"
        style={{ color: "var(--text-secondary)" }}
      >
        {property.address}
      </p>

      {/* Property details grid */}
      <div 
        className="grid grid-cols-4 gap-2 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        <div className="flex items-center gap-1">
          <Bed className="w-3.5 h-3.5" />
          <span className="font-mono">{property.bedrooms}</span>
        </div>
        <div className="flex items-center gap-1">
          <Bath className="w-3.5 h-3.5" />
          <span className="font-mono">{property.bathrooms}</span>
        </div>
        <div className="flex items-center gap-1">
          <Maximize className="w-3.5 h-3.5" />
          <span className="font-mono">{property.sqft.toLocaleString()}</span>
        </div>
        {property.yearBuilt && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span className="font-mono">{property.yearBuilt}</span>
          </div>
        )}
      </div>

      {/* Home type badge */}
      {property.homeType && (
        <div 
          className="mt-2 inline-block px-2 py-0.5 rounded text-xs font-medium"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-secondary)",
          }}
        >
          {property.homeType}
        </div>
      )}

      {/* Rent estimate for buy properties */}
      {isBuy && property.rentZestimate && (
        <div 
          className="mt-2 text-xs flex items-center gap-1"
          style={{ color: "var(--text-muted)" }}
        >
          <Sparkles className="w-3 h-3 text-copper-400" />
          Est. rent: <span className="font-mono font-medium" style={{ color: "var(--text-secondary)" }}>${property.rentZestimate.toLocaleString()}/mo</span>
        </div>
      )}

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          color: "var(--text-muted)",
        }}
        aria-label={`Remove ${type} property`}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
});
