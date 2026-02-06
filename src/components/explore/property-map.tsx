import { memo, useCallback, useRef, useMemo, useEffect, useState } from "react";
import { clsx } from "clsx";
import type { Property } from "./property-card";
import Map, {
  Marker,
  Popup,
  NavigationControl,
  GeolocateControl,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Search, Loader2 } from "lucide-react";

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

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
  center: { lat: number; lng: number };
}

interface PropertyMapProps {
  initialViewState: ViewState;
  // Optional: fly to this location when it changes
  flyToLocation?: { longitude: number; latitude: number; zoom: number } | null;
  properties: Property[];
  selectedProperty: Property | null;
  onPropertySelect: (property: Property | null) => void;
  renderPopup: (property: Property) => React.ReactNode;
  theme?: "light" | "dark";
  // Called when user moves the map and we should show "Search this area"
  onBoundsChange?: (bounds: MapBounds) => void;
  // Called when user clicks "Search this area"
  onSearchArea?: (bounds: MapBounds) => void;
  // Whether we're currently loading new properties
  isLoading?: boolean;
  // Whether the current view matches the search area
  isSearchInSync?: boolean;
}

/**
 * Property map component with lazy-loaded MapLibre
 * Uses uncontrolled mode (initialViewState) to avoid re-render loops
 * Uses flyTo for programmatic navigation
 */
export const PropertyMap = memo(function PropertyMap({
  initialViewState,
  flyToLocation,
  properties,
  selectedProperty,
  onPropertySelect,
  renderPopup,
  theme = "dark",
  onBoundsChange,
  onSearchArea,
  isLoading = false,
  isSearchInSync = true,
}: PropertyMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [currentBounds, setCurrentBounds] = useState<MapBounds | null>(null);
  const [hasUserPanned, setHasUserPanned] = useState(false);
  
  // Derive showSearchButton from props and local state - no useEffect needed!
  // This follows the "derive state during render" best practice
  const showSearchButton = hasUserPanned && !isSearchInSync;
  
  // Memoize map style based on theme
  const mapStyle = useMemo(() => MAP_STYLES[theme], [theme]);

  // Track whether we've already applied flyToLocation so we can handle the
  // case where it was set before the map finished loading.
  const appliedFlyRef = useRef<ViewState | null>(null);

  // Fly to location when it changes (for search results / geolocation)
  useEffect(() => {
    if (!flyToLocation || flyToLocation === appliedFlyRef.current) return;
    if (!mapRef.current) return;

    appliedFlyRef.current = flyToLocation;
    setHasUserPanned(false);
    mapRef.current.flyTo({
      center: [flyToLocation.longitude, flyToLocation.latitude],
      zoom: flyToLocation.zoom,
      duration: 1500,
    });
  }, [flyToLocation]);

  // Handle the case where flyToLocation was set before the map loaded —
  // re-check once the map fires its first onLoad/onMoveEnd.
  const handleLoad = useCallback(() => {
    if (flyToLocation && flyToLocation !== appliedFlyRef.current && mapRef.current) {
      appliedFlyRef.current = flyToLocation;
      setHasUserPanned(false);
      mapRef.current.flyTo({
        center: [flyToLocation.longitude, flyToLocation.latitude],
        zoom: flyToLocation.zoom,
        duration: 1500,
      });
    }
  }, [flyToLocation]);

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

  // Handle map movement end - show "Search this area" button
  const handleMoveEnd = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const bounds = map.getBounds();
    const center = map.getCenter();
    
    const newBounds: MapBounds = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
      center: { lat: center.lat, lng: center.lng },
    };

    setCurrentBounds(newBounds);
    setHasUserPanned(true);
    onBoundsChange?.(newBounds);
  }, [onBoundsChange]);

  // Handle "Search this area" click
  const handleSearchArea = useCallback(() => {
    if (currentBounds && onSearchArea) {
      setHasUserPanned(false);
      onSearchArea(currentBounds);
    }
  }, [currentBounds, onSearchArea]);

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        onClick={handleMapClick}
        onMoveEnd={handleMoveEnd}
        onLoad={handleLoad}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
        reuseMaps
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        <GeolocateControl
          position="bottom-right"
          trackUserLocation={false}
          showUserLocation
          positionOptions={{ enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }}
        />

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

      {/* Search this area button */}
      {showSearchButton && onSearchArea && !isLoading && (
        <button
          onClick={handleSearchArea}
          className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
          }}
        >
          <Search className="w-4 h-4 text-copper-400" />
          <span className="text-sm font-medium">Search this area</span>
        </button>
      )}

      {/* Loading indicator when searching */}
      {isLoading && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            color: "var(--text-secondary)",
          }}
        >
          <Loader2 className="w-4 h-4 text-copper-400 animate-spin" />
          <span className="text-sm">Searching...</span>
        </div>
      )}

      {/* No results message */}
      {!isLoading && properties.length === 0 && isSearchInSync && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            color: "var(--text-secondary)",
          }}
        >
          <span className="text-sm">No properties found in this area</span>
        </div>
      )}
    </div>
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
  const isUnavailable = property.isPending || property.isContingent;

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
          isSelected && "z-10",
          isUnavailable && "opacity-50"
        )}
      >
        <div
          className={clsx(
            "marker font-mono",
            "transform group-hover:scale-110 transition-transform",
            property.propertyType === "sale"
              ? "marker-sale"
              : "marker-rent",
            isSelected && "scale-110 ring-2 ring-white/50",
            isUnavailable && "grayscale"
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
