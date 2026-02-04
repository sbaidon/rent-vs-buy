import { memo, useCallback, useRef, Suspense, lazy, useMemo } from "react";
import { clsx } from "clsx";
import type { Property } from "./property-card";

// Lazy load MapLibre components (Vercel best practice: bundle-dynamic-imports)
// This reduces initial bundle by ~1MB
const Map = lazy(() =>
  import("react-map-gl/maplibre").then((mod) => ({ default: mod.default }))
);
const Marker = lazy(() =>
  import("react-map-gl/maplibre").then((mod) => ({ default: mod.Marker }))
);
const Popup = lazy(() =>
  import("react-map-gl/maplibre").then((mod) => ({ default: mod.Popup }))
);
const NavigationControl = lazy(() =>
  import("react-map-gl/maplibre").then((mod) => ({
    default: mod.NavigationControl,
  }))
);
const GeolocateControl = lazy(() =>
  import("react-map-gl/maplibre").then((mod) => ({
    default: mod.GeolocateControl,
  }))
);

// Import CSS only on client side
if (typeof window !== "undefined") {
  import("maplibre-gl/dist/maplibre-gl.css");
}

// Map styles for different themes
const MAP_STYLES = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
} as const;

export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

interface PropertyMapProps {
  viewState: ViewState;
  onViewStateChange: (viewState: ViewState) => void;
  properties: Property[];
  selectedProperty: Property | null;
  onPropertySelect: (property: Property | null) => void;
  renderPopup: (property: Property) => React.ReactNode;
  theme?: "light" | "dark";
}

// Map skeleton for loading state
const MapSkeleton = memo(function MapSkeleton() {
  return (
    <div 
      className="w-full h-full animate-pulse flex items-center justify-center"
      style={{ background: "var(--bg-muted)" }}
    >
      <div className="text-center">
        <div 
          className="w-12 h-12 rounded-full mx-auto mb-3"
          style={{ background: "var(--bg-elevated)" }}
        />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading map...</p>
      </div>
    </div>
  );
});

/**
 * Property map component with lazy-loaded MapLibre
 * Uses Suspense for progressive loading (Vercel best practice: async-suspense-boundaries)
 */
export const PropertyMap = memo(function PropertyMap({
  viewState,
  onViewStateChange,
  properties,
  selectedProperty,
  onPropertySelect,
  renderPopup,
  theme = "dark",
}: PropertyMapProps) {
  const mapRef = useRef(null);
  
  // Memoize map style based on theme
  const mapStyle = useMemo(() => MAP_STYLES[theme], [theme]);

  const handleMove = useCallback(
    (evt: { viewState: ViewState }) => {
      onViewStateChange(evt.viewState);
    },
    [onViewStateChange]
  );

  const handleMarkerClick = useCallback(
    (property: Property) => (e: { originalEvent: MouseEvent }) => {
      e.originalEvent.stopPropagation();
      onPropertySelect(property);
    },
    [onPropertySelect]
  );

  const handlePopupClose = useCallback(() => {
    onPropertySelect(null);
  }, [onPropertySelect]);

  // Close popup when clicking on map
  const handleMapClick = useCallback(() => {
    if (selectedProperty) {
      onPropertySelect(null);
    }
  }, [selectedProperty, onPropertySelect]);

  return (
    <Suspense fallback={<MapSkeleton />}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleMove}
        onClick={handleMapClick}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        <GeolocateControl position="bottom-right" />

        {/* Property Markers */}
        {properties.map((property) => (
          <PropertyMarker
            key={property.id}
            property={property}
            isSelected={selectedProperty?.id === property.id}
            onClick={handleMarkerClick(property)}
          />
        ))}

        {/* Property Popup */}
        {selectedProperty && (
          <Popup
            longitude={selectedProperty.lng}
            latitude={selectedProperty.lat}
            anchor="bottom"
            onClose={handlePopupClose}
            closeButton={false}
            closeOnClick={false}
            offset={20}
            maxWidth="none"
            className="property-popup"
          >
            {renderPopup(selectedProperty)}
          </Popup>
        )}
      </Map>
    </Suspense>
  );
});

// Extracted marker component for better memoization
interface PropertyMarkerProps {
  property: Property;
  isSelected: boolean;
  onClick: (e: { originalEvent: MouseEvent }) => void;
}

const PropertyMarker = memo(function PropertyMarker({
  property,
  isSelected,
  onClick,
}: PropertyMarkerProps) {
  return (
    <Marker
      longitude={property.lng}
      latitude={property.lat}
      anchor="center"
      onClick={onClick}
    >
      <div
        className={clsx(
          "group cursor-pointer transition-all duration-200",
          isSelected && "z-10"
        )}
      >
        <div
          className={clsx(
            "marker font-mono",
            "transform group-hover:scale-110 transition-transform",
            property.propertyType === "sale"
              ? "marker-sale"
              : "marker-rent",
            isSelected && "scale-110 ring-2 ring-white/50"
          )}
        >
          $
          {property.propertyType === "sale"
            ? `${Math.round(property.price / 1000)}K`
            : property.price.toLocaleString()}
        </div>
      </div>
    </Marker>
  );
});
