import { memo, useCallback } from "react";
import { clsx } from "clsx";
import { Home, Building2, X, Sparkles, ArrowRight } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export interface Property {
  id: string;
  address: string;
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
}

interface PropertyCardProps {
  property: Property;
  onCompare: (property: Property) => void;
  onClose?: () => void;
}

/**
 * Property card component displayed in map popups
 * Memoized to prevent re-renders when parent state changes
 */
export const PropertyCard = memo(function PropertyCard({
  property,
  onCompare,
  onClose,
}: PropertyCardProps) {
  const isForSale = property.propertyType === "sale";

  // Use callback to prevent function recreation (Vercel best practice: rerender-functional-setstate)
  const handleCompare = useCallback(() => {
    onCompare(property);
  }, [onCompare, property]);

  return (
    <div 
      className="w-[280px] sm:w-72 p-3 sm:p-4 rounded-lg shadow-xl"
      style={{ 
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)"
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
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>/month</span>
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
        className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm mb-3 sm:mb-4 font-mono"
        style={{ color: "var(--text-muted)" }}
      >
        <span>{property.bedrooms} bed</span>
        <span>{property.bathrooms} bath</span>
        <span>{property.sqft.toLocaleString()} sqft</span>
      </div>

      {/* Rent estimate for sale properties */}
      {isForSale && property.rentZestimate && (
        <div 
          className="flex items-center gap-2 text-xs sm:text-sm rounded px-2.5 sm:px-3 py-2 mb-3 sm:mb-4"
          style={{ 
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)"
          }}
        >
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-copper-400 flex-shrink-0" />
          <span style={{ color: "var(--text-secondary)" }}>
            Est. rent:{" "}
            <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
              ${property.rentZestimate.toLocaleString()}/mo
            </span>
          </span>
        </div>
      )}

      {/* CTA Button */}
      <Button onClick={handleCompare} size="sm" className="w-full group">
        Compare Rent vs Buy
        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" />
      </Button>
    </div>
  );
});
