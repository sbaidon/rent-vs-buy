import { createContext, use, useCallback, useEffect, useRef, useState } from "react";
import type { Property } from "../components/explore/property-card";
import type { ViewState, MapBounds } from "../components/explore/property-map";
import type { LocationResult } from "../components/explore/search-bar";
import type { FilterType } from "../components/explore/filter-pills";
import type { FilterValues } from "../components/explore/filters-panel";
import { defaultFilters } from "../components/explore/filters-panel";
import type { ComparisonSelection } from "../components/explore/comparison-tray";
import { searchProperties } from "../server/functions/listings";
import { toast } from "sonner";

// =============================================================================
// Context Interface (state, actions, meta)
// =============================================================================

export interface ExploreState {
  // Location state
  searchQuery: string;
  apiLocationQuery: string;
  searchLocation: { lat: number; lng: number };
  isGeolocating: boolean;
  
  // Map state
  initialViewState: ViewState;
  flyToLocation: ViewState | null;
  selectedProperty: Property | null;
  isSearchInSync: boolean;
  
  // Properties state
  properties: Property[];
  isLoading: boolean;
  
  // Filter state
  filter: FilterType;
  filters: FilterValues;
  appliedFilters: FilterValues;
  showFilters: boolean;
  
  // UI state
  showInsights: boolean;
  
  // Comparison state
  comparisonSelection: ComparisonSelection;
}

export interface ExploreActions {
  // Location actions
  setSearchQuery: (query: string) => void;
  handleLocationSelect: (location: LocationResult) => void;
  handleSearchArea: (bounds: MapBounds) => Promise<void>;
  
  // Map actions
  setSelectedProperty: (property: Property | null) => void;
  handleBoundsChange: (bounds?: MapBounds) => void;
  
  // Filter actions
  setFilter: (filter: FilterType) => void;
  setFilters: (filters: FilterValues) => void;
  openFilters: () => void;
  closeFilters: () => void;
  applyFilters: () => void;
  
  // UI actions
  openInsights: () => void;
  closeInsights: () => void;
  
  // Comparison actions
  selectPropertyForComparison: (property: Property) => void;
  removeFromComparison: (type: "buy" | "rent") => void;
}

export interface MarketStats {
  medianHomePrice: number | null;
  medianRent: number | null;
  priceToRentRatio: number | null;
  daysOnMarket: number | null;
  inventoryCount: number;
}

export interface ExploreMeta {
  activeFilterCount: number;
  showComparisonTray: boolean;
  marketStats: MarketStats;
}

export interface ExploreContextValue {
  state: ExploreState;
  actions: ExploreActions;
  meta: ExploreMeta;
}

// =============================================================================
// Context
// =============================================================================

export const ExploreContext = createContext<ExploreContextValue | null>(null);

export function useExplore(): ExploreContextValue {
  const context = use(ExploreContext);
  if (!context) {
    throw new Error("useExplore must be used within an ExploreProvider");
  }
  return context;
}

// =============================================================================
// Constants
// =============================================================================

const FALLBACK_LOCATION = {
  lat: 30.2672,
  lng: -97.7431,
  name: "Austin, TX",
};

// =============================================================================
// Provider
// =============================================================================

interface ExploreProviderProps {
  children: React.ReactNode;
}

export function ExploreProvider({ children }: ExploreProviderProps) {
  const hasRequestedLocation = useRef(false);
  
  // Location state — start with fallback so map + fetch can begin immediately
  const [searchQuery, setSearchQuery] = useState(FALLBACK_LOCATION.name);
  const [apiLocationQuery, setApiLocationQuery] = useState(FALLBACK_LOCATION.name);
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lng: number }>({
    lat: FALLBACK_LOCATION.lat,
    lng: FALLBACK_LOCATION.lng,
  });
  const [isGeolocating, setIsGeolocating] = useState(true);
  
  // Map state — initialise with fallback so <Map> can render immediately
  const [initialViewState] = useState<ViewState>({
    latitude: FALLBACK_LOCATION.lat,
    longitude: FALLBACK_LOCATION.lng,
    zoom: 13,
  });
  const [flyToLocation, setFlyToLocation] = useState<ViewState | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isSearchInSync, setIsSearchInSync] = useState(true);
  
  // Properties state
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter state
  const [filter, setFilter] = useState<FilterType>("all");
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  
  // UI state
  const [showInsights, setShowInsights] = useState(false);
  
  // Comparison state
  const [comparisonSelection, setComparisonSelection] = useState<ComparisonSelection>({
    buy: null,
    rent: null,
  });

  // ==========================================================================
  // Geolocation effect
  // ==========================================================================
  
  useEffect(() => {
    if (hasRequestedLocation.current) return;
    hasRequestedLocation.current = true;

    if (!navigator.geolocation) {
      // Fallback values already set as initial state
      setIsGeolocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Fly map to user location and update search coords immediately
        setSearchLocation({ lat: latitude, lng: longitude });
        setFlyToLocation({ latitude, longitude, zoom: 13 });
        setIsGeolocating(false);

        // Reverse geocode runs in parallel — only updates the display name
        // Property fetch can already start with the fallback apiLocationQuery
        fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
        )
          .then((r) => r.json())
          .then((data: any) => {
            const city = data.address?.city || data.address?.town || data.address?.village || "";
            const state = data.address?.state || "";
            const locationName = city && state ? `${city}, ${state}` : city || state || "Your Location";
            setSearchQuery(locationName);
            setApiLocationQuery(locationName);
          })
          .catch(() => {
            setSearchQuery("Your Location");
            toast.error("Could not determine your location name");
          });
      },
      () => {
        // Denied / error — fallback values already set as initial state
        setIsGeolocating(false);
        toast.info("Location access denied — showing Austin, TX");
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    );
  }, []);

  // ==========================================================================
  // Property fetching effect
  // ==========================================================================
  
  useEffect(() => {
    if (!apiLocationQuery) return;
    
    let cancelled = false;
    
    async function fetchProperties() {
      setIsLoading(true);
      try {
        const result = await searchProperties({
          data: {
            location: apiLocationQuery,
            lat: searchLocation.lat,
            lng: searchLocation.lng,
            propertyType: filter === "all" ? "all" : filter === "sale" ? "sale" : "rent",
            minPrice: appliedFilters.priceMin,
            maxPrice: appliedFilters.priceMax,
            bedsMin: appliedFilters.bedsMin,
            bedsMax: appliedFilters.bedsMax,
            bathsMin: appliedFilters.bathsMin,
            sqftMin: appliedFilters.sqftMin,
            sqftMax: appliedFilters.sqftMax,
            propertyTypes: appliedFilters.propertyTypes.length > 0 ? appliedFilters.propertyTypes : undefined,
          },
        });
        
        if (!cancelled) {
          setProperties((result.properties as Property[]).filter(p => p.price > 0));
          setIsSearchInSync(true);
        }
      } catch (error) {
        console.error("Error fetching properties:", error);
        if (!cancelled) {
          toast.error("Failed to load properties");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    
    fetchProperties();
    return () => { cancelled = true; };
  }, [apiLocationQuery, searchLocation, filter, appliedFilters]);

  // ==========================================================================
  // Actions
  // ==========================================================================
  
  const handleLocationSelect = useCallback((location: LocationResult) => {
    setSearchLocation({ lat: location.lat, lng: location.lng });
    setFlyToLocation({ longitude: location.lng, latitude: location.lat, zoom: 13 });
    setSelectedProperty(null);
    setIsSearchInSync(true);
    
    const parts = location.displayName.split(", ");
    setSearchQuery(parts.slice(0, 2).join(", "));
    setApiLocationQuery(location.displayName);
  }, []);

  const handleSearchArea = useCallback(async (bounds: MapBounds) => {
    setIsLoading(true);
    setSearchLocation({ lat: bounds.center.lat, lng: bounds.center.lng });
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${bounds.center.lat}&lon=${bounds.center.lng}&format=json`
      );
      const data = await response.json();
      const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "";
      const state = data.address?.state || "";
      const locationName = city && state ? `${city}, ${state}` : city || state || "This Area";
      setSearchQuery(locationName);
      setApiLocationQuery(locationName);
    } catch {
      setSearchQuery("This Area");
      setApiLocationQuery("Austin, TX");
      toast.error("Could not identify this area");
    }
    
    setIsSearchInSync(true);
  }, []);

  const handleBoundsChange = useCallback((_bounds?: MapBounds) => {
    setIsSearchInSync(false);
  }, []);

  const selectPropertyForComparison = useCallback((property: Property) => {
    setComparisonSelection((prev) => {
      if (property.propertyType === "sale") {
        if (prev.buy?.id === property.id) return { ...prev, buy: null };
        return { ...prev, buy: property };
      } else {
        if (prev.rent?.id === property.id) return { ...prev, rent: null };
        return { ...prev, rent: property };
      }
    });
    setSelectedProperty(null);
  }, []);

  const removeFromComparison = useCallback((type: "buy" | "rent") => {
    setComparisonSelection((prev) => ({ ...prev, [type]: null }));
  }, []);

  const openFilters = useCallback(() => {
    setFilters(appliedFilters);
    setShowFilters(true);
  }, [appliedFilters]);

  const closeFilters = useCallback(() => setShowFilters(false), []);
  const applyFilters = useCallback(() => setAppliedFilters(filters), [filters]);
  const openInsights = useCallback(() => setShowInsights(true), []);
  const closeInsights = useCallback(() => setShowInsights(false), []);


  
  // ==========================================================================
  // Meta (derived values)
  // ==========================================================================
  
  const activeFilterCount = [
    appliedFilters.priceMin !== undefined || appliedFilters.priceMax !== undefined,
    appliedFilters.bedsMin !== undefined,
    appliedFilters.bathsMin !== undefined,
    appliedFilters.sqftMin !== undefined || appliedFilters.sqftMax !== undefined,
    appliedFilters.propertyTypes.length > 0,
  ].filter(Boolean).length;

  const showComparisonTray = comparisonSelection.buy !== null || comparisonSelection.rent !== null;

  // Derive market stats from fetched properties
  const marketStats: MarketStats = (() => {
    const sales = properties.filter(p => p.propertyType === "sale" && p.price > 0);
    const rentals = properties.filter(p => p.propertyType === "rent" && p.price > 0);

    const median = (arr: number[]): number | null => {
      if (arr.length === 0) return null;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    const medianHomePrice = median(sales.map(p => p.price));
    const medianRent = median(rentals.map(p => p.price));
    const priceToRentRatio = medianHomePrice && medianRent
      ? Math.round((medianHomePrice / (medianRent * 12)) * 10) / 10
      : null;

    const daysValues = sales.filter(p => p.daysOnMarket != null).map(p => p.daysOnMarket!);
    const daysOnMarket = median(daysValues);

    return {
      medianHomePrice,
      medianRent,
      priceToRentRatio,
      daysOnMarket: daysOnMarket != null ? Math.round(daysOnMarket) : null,
      inventoryCount: sales.length,
    };
  })();

  // ==========================================================================
  // Context value
  // ==========================================================================
  
  const state: ExploreState = {
    searchQuery,
    apiLocationQuery,
    searchLocation,
    isGeolocating,
    initialViewState,
    flyToLocation,
    selectedProperty,
    isSearchInSync,
    properties,
    isLoading,
    filter,
    filters,
    appliedFilters,
    showFilters,
    showInsights,
    comparisonSelection,
  };

  const actions: ExploreActions = {
    setSearchQuery,
    handleLocationSelect,
    handleSearchArea,
    setSelectedProperty,
    handleBoundsChange,
    setFilter,
    setFilters,
    openFilters,
    closeFilters,
    applyFilters,
    openInsights,
    closeInsights,
    selectPropertyForComparison,
    removeFromComparison,
  };

  const meta: ExploreMeta = {
    activeFilterCount,
    showComparisonTray,
    marketStats,
  };

  return (
    <ExploreContext value={{ state, actions, meta }}>
      {children}
    </ExploreContext>
  );
}
