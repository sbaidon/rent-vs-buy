import { memo, useCallback } from "react";
import { Home, Building2, X, Sparkles, Plus, Check, Calendar, Ruler, ExternalLink } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export interface Property {
  id: string;
  address: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  propertyType: "sale" | "rent";
  lat: number;
  lng: number;
  imageUrl?: string;
  zestimate?: number;
  rentZestimate?: number;
  yearBuilt?: number;
  homeType?: string;
  lotSize?: number;
  daysOnMarket?: number;
}

interface PropertyCardProps {
  property: Property;
  onSelect?: (property: Property) => void;
  onClose?: () => void;
  isSelected?: boolean;
}

/**
 * Property card component displayed in map popups
 * Supports selection mode for the comparison tray feature
 * Memoized to prevent re-renders when parent state changes
 */
export const PropertyCard = memo(function PropertyCard({
  property,
  onSelect,
  onClose,
  isSelected = false,
}: PropertyCardProps) {
  const isForSale = property.propertyType === "sale";

  const handleSelect = useCallback(() => {
    onSelect?.(property);
  }, [onSelect, property]);

  return (
    <div
      className="w-[280px] sm:w-72 p-3 sm:p-4 rounded-lg shadow-xl transition-all"
      style={{
        background: "var(--bg-elevated)",
        border: isSelected
          ? `2px solid ${isForSale ? "var(--color-gain)" : "var(--color-blueprint-400)"}`
          : "1px solid var(--border-default)",
      }}
    >
      {/* Header with close button */}
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <Badge variant={isForSale ? "sale" : "rent"}>
          {isForSale ? (
            <Home className="w-3 h-3" />
          ) : (
            <Building2 className="w-3 h-3" />
          )}
          {isForSale ? "For Sale" : "For Rent"}
        </Badge>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 -mr-1 -mt-1 rounded-full transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-muted)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Price */}
      <div className="mb-1 sm:mb-2">
        <span
          className="text-xl sm:text-2xl font-mono font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          ${property.price.toLocaleString()}
        </span>
        {!isForSale && (
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            /month
          </span>
        )}
      </div>

      {/* Address */}
      <p
        className="text-sm mb-2 sm:mb-3 truncate"
        style={{ color: "var(--text-secondary)" }}
      >
        {property.address}
      </p>

      {/* Details */}
      <div
        className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm mb-2 font-mono"
        style={{ color: "var(--text-muted)" }}
      >
        <span>{property.bedrooms} bed</span>
        <span>{property.bathrooms} bath</span>
        <span>{property.sqft.toLocaleString()} sqft</span>
      </div>

      {/* Additional Details */}
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-3 sm:mb-4"
        style={{ color: "var(--text-muted)" }}
      >
        {property.homeType && (
          <span className="flex items-center gap-1">
            <Home className="w-3 h-3" />
            {property.homeType}
          </span>
        )}
        {property.yearBuilt && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Built {property.yearBuilt}
          </span>
        )}
        {property.lotSize && property.lotSize > 0 && (
          <span className="flex items-center gap-1">
            <Ruler className="w-3 h-3" />
            {(property.lotSize / 43560).toFixed(2)} acres
          </span>
        )}
        {property.daysOnMarket !== undefined && property.daysOnMarket >= 0 && (
          <span
            style={{
              color: property.daysOnMarket <= 7 
                ? "var(--color-gain)" 
                : property.daysOnMarket <= 30 
                  ? "var(--text-muted)" 
                  : "var(--color-copper-400)"
            }}
          >
            {property.daysOnMarket === 0 ? "New today" : `${property.daysOnMarket}d on market`}
          </span>
        )}
      </div>

      {/* Rent estimate for sale properties */}
      {isForSale && property.rentZestimate && (
        <div
          className="flex items-center gap-2 text-xs sm:text-sm rounded px-2.5 sm:px-3 py-2 mb-3 sm:mb-4"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-copper-400 flex-shrink-0" />
          <span style={{ color: "var(--text-secondary)" }}>
            Est. rent:{" "}
            <span
              className="font-mono font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              ${property.rentZestimate.toLocaleString()}/mo
            </span>
          </span>
        </div>
      )}

      {/* CTA Button - Select for comparison */}
      {onSelect && (
        <Button
          onClick={handleSelect}
          size="sm"
          className="w-full group"
          variant={isSelected ? "secondary" : "primary"}
          style={
            isSelected
              ? {
                  background: isForSale
                    ? "rgba(34, 197, 94, 0.15)"
                    : "rgba(56, 189, 248, 0.15)",
                  borderColor: isForSale
                    ? "rgba(34, 197, 94, 0.5)"
                    : "rgba(56, 189, 248, 0.5)",
                  color: isForSale
                    ? "var(--color-gain)"
                    : "var(--color-blueprint-400)",
                }
              : undefined
          }
        >
          {isSelected ? (
            <>
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Selected for {isForSale ? "Buy" : "Rent"}
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Select for {isForSale ? "Buy" : "Rent"}
            </>
          )}
        </Button>
      )}

      {/* View Listing Link */}
      <a
        href={`https://www.realtor.com/realestateandhomes-detail/${property.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 mt-2 py-1.5 text-xs transition-colors hover:text-copper-400"
        style={{ color: "var(--text-muted)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="w-3 h-3" />
        View on Realtor.com
      </a>
    </div>
  );
});
