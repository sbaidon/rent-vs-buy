import { memo, useCallback, useRef, Suspense, lazy } from "react";
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
}

// Map skeleton for loading state
const MapSkeleton = memo(function MapSkeleton() {
  return (
    <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-slate-200 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading map...</p>
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
}: PropertyMapProps) {
  const mapRef = useRef(null);

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

  return (
    <Suspense fallback={<MapSkeleton />}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleMove}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
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
            "px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg",
            "transform group-hover:scale-110 transition-transform",
            "border-2 border-white",
            property.propertyType === "sale"
              ? "bg-emerald-500 text-white"
              : "bg-sky-500 text-white",
            isSelected && "scale-110 ring-4 ring-sky-200"
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
