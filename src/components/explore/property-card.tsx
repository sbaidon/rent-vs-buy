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
    <div className="w-72">
      {/* Header with close button */}
      <div className="flex items-start justify-between mb-3">
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
            className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Price */}
      <div className="mb-2">
        <span className="text-2xl font-bold text-slate-900">
          ${property.price.toLocaleString()}
        </span>
        {!isForSale && <span className="text-slate-500 text-sm">/month</span>}
      </div>

      {/* Address */}
      <p className="text-sm text-slate-600 mb-3">{property.address}</p>

      {/* Details */}
      <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
        <span className="font-medium">{property.bedrooms} bed</span>
        <span className="font-medium">{property.bathrooms} bath</span>
        <span className="font-medium">{property.sqft.toLocaleString()} sqft</span>
      </div>

      {/* Rent estimate for sale properties */}
      {isForSale && property.rentZestimate && (
        <div className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2 mb-4">
          <Sparkles className="w-4 h-4 text-sky-500" />
          <span className="text-slate-600">
            Est. rent:{" "}
            <span className="font-semibold text-slate-900">
              ${property.rentZestimate.toLocaleString()}/mo
            </span>
          </span>
        </div>
      )}

      {/* CTA Button */}
      <Button onClick={handleCompare} className="w-full group">
        Compare Rent vs Buy
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </Button>
    </div>
  );
});
