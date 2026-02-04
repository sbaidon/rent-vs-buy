import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useMemo } from "react";
import { MapPin, SlidersHorizontal, TrendingUp, ChevronRight } from "lucide-react";

// Import composable components
import { SearchBar } from "../components/explore/search-bar";
import { FilterPills, type FilterType } from "../components/explore/filter-pills";
import { PropertyCard, type Property } from "../components/explore/property-card";
import { MarketInsights } from "../components/explore/market-insights";
import { PropertyMap, type ViewState } from "../components/explore/property-map";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { encodeState } from "../utils/state";
import { initialValues } from "../constants/calculator";
import { useTheme } from "../context/theme-context";

// Mock data - will be replaced with API calls
const MOCK_PROPERTIES: Property[] = [
  {
    id: "1",
    address: "123 Main St",
    price: 450000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1800,
    propertyType: "sale",
    lat: 30.2672,
    lng: -97.7431,
    zestimate: 455000,
    rentZestimate: 2200,
    yearBuilt: 2005,
    homeType: "Single Family",
  },
  {
    id: "2",
    address: "456 Oak Ave",
    price: 2100,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 950,
    propertyType: "rent",
    lat: 30.2749,
    lng: -97.7404,
    yearBuilt: 2018,
    homeType: "Apartment",
  },
  {
    id: "3",
    address: "789 Congress Ave",
    price: 625000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2400,
    propertyType: "sale",
    lat: 30.2747,
    lng: -97.7443,
    zestimate: 630000,
    rentZestimate: 3100,
    yearBuilt: 2010,
    homeType: "Single Family",
  },
  {
    id: "4",
    address: "321 Lamar Blvd",
    price: 1850,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 720,
    propertyType: "rent",
    lat: 30.2621,
    lng: -97.7538,
    yearBuilt: 2020,
    homeType: "Condo",
  },
  {
    id: "5",
    address: "555 E 6th St",
    price: 525000,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1200,
    propertyType: "sale",
    lat: 30.2676,
    lng: -97.7372,
    zestimate: 530000,
    rentZestimate: 2600,
    yearBuilt: 2015,
    homeType: "Condo",
  },
];

// Initial view state - hoisted outside component (Vercel best practice: rerender-lazy-state-init)
const INITIAL_VIEW_STATE: ViewState = {
  longitude: -97.7431,
  latitude: 30.2672,
  zoom: 13,
};

/**
 * Explore page with interactive map for property search
 * Follows Vercel React best practices:
 * - Lazy loading for MapLibre (bundle-dynamic-imports)
 * - Memoized components to prevent re-renders
 * - Direct imports to avoid barrel files
 * - Derived state computed during render (rerender-derived-state-no-effect)
 */
function ExplorePage() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();

  // State management with lazy initialization where appropriate
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("Austin, TX");
  const [showInsights, setShowInsights] = useState(false); // Default closed on mobile

  // Derive filtered properties during render (Vercel best practice: rerender-derived-state-no-effect)
  const filteredProperties = useMemo(() => {
    if (filter === "all") return MOCK_PROPERTIES;
    return MOCK_PROPERTIES.filter((p) => p.propertyType === filter);
  }, [filter]);

  // Stable callbacks to prevent child re-renders (Vercel best practice: rerender-functional-setstate)
  const handleSearch = useCallback(() => {
    console.log("Searching for:", searchQuery);
    // TODO: Implement geocoding and property search
  }, [searchQuery]);

  const handleCompare = useCallback(
    (property: Property) => {
      // Create state with property values pre-filled
      const newValues = {
        ...initialValues,
        homePrice:
          property.propertyType === "sale"
            ? property.price
            : property.price * 250, // Estimate home price from rent
        monthlyRent:
          property.propertyType === "rent"
            ? property.price
            : property.rentZestimate || Math.round(property.price * 0.004),
      };

      const encoded = encodeState(newValues);
      navigate({ to: "/", search: { q: encoded } });
    },
    [navigate]
  );

  const handleCloseInsights = useCallback(() => setShowInsights(false), []);
  const handleOpenInsights = useCallback(() => setShowInsights(true), []);

  // Render popup content - memoized via useCallback
  const renderPopup = useCallback(
    (property: Property) => (
      <PropertyCard
        property={property}
        onCompare={handleCompare}
        onClose={() => setSelectedProperty(null)}
      />
    ),
    [handleCompare]
  );

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col" style={{ background: "var(--bg-base)" }}>
      {/* Search Header */}
      <header 
        className="backdrop-blur-xl border-b px-4 py-3 sm:py-4 z-20"
        style={{ 
          background: "color-mix(in srgb, var(--bg-surface) 95%, transparent)",
          borderColor: "var(--border-default)"
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
          />
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
            <FilterPills activeFilter={filter} onFilterChange={setFilter} />
            <Button variant="secondary" size="sm" className="flex-shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <div className="flex-1 relative overflow-hidden">
        <PropertyMap
          viewState={viewState}
          onViewStateChange={setViewState}
          properties={filteredProperties}
          selectedProperty={selectedProperty}
          onPropertySelect={setSelectedProperty}
          renderPopup={renderPopup}
          theme={resolvedTheme}
        />

        {/* Property Count Badge */}
        <Card padding="sm" className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 z-10">
          <MapPin className="w-4 h-4 text-copper-400" />
          <span className="text-xs sm:text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
            {filteredProperties.length} properties in {searchQuery}
          </span>
        </Card>

        {/* Market Insights Panel */}
        <MarketInsights
          isOpen={showInsights}
          onClose={handleCloseInsights}
          location={searchQuery}
        />

        {/* Toggle Insights Button (when panel is closed) */}
        {!showInsights && (
          <button
            onClick={handleOpenInsights}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10"
          >
            <Card
              padding="sm"
              hover
              className="flex items-center gap-2 cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-copper-400" />
              <span className="text-xs sm:text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                <span className="hidden sm:inline">Market </span>Insights
              </span>
              <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            </Card>
          </button>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/explore")({
  component: ExplorePage,
});
