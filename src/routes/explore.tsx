import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, lazy, Suspense } from "react";
import { MapPin, SlidersHorizontal, TrendingUp, ChevronRight, Loader2 } from "lucide-react";

// Import composable components
import { SearchBar } from "../components/explore/search-bar";
import { FilterPills } from "../components/explore/filter-pills";
import { PropertyCard, type Property } from "../components/explore/property-card";
import { MarketInsights } from "../components/explore/market-insights";
import { ComparisonTray } from "../components/explore/comparison-tray";
import { FiltersPanel } from "../components/explore/filters-panel";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { encodeState } from "../schemas/calculator";
import { initialValues } from "../constants/calculator";
import { useTheme } from "../context/theme-context";
import { ExploreProvider, useExplore } from "../context/explore-context";

// Lazy load the heavy map component (MapLibre is ~1MB)
const PropertyMap = lazy(() => 
  import("../components/explore/property-map").then(mod => ({ default: mod.PropertyMap }))
);

// Skeleton shown while map is loading
function MapSkeleton() {
  return (
    <div 
      className="w-full h-full flex items-center justify-center"
      style={{ background: "var(--bg-base)" }}
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-copper-400 animate-spin" />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading map...</p>
      </div>
    </div>
  );
}

// =============================================================================
// Compound Components - Each component reads from context
// =============================================================================

function ExploreHeader() {
  const { state, actions, meta } = useExplore();

  return (
    <header
      className="backdrop-blur-xl border-b px-4 py-3 sm:py-4 z-20"
      style={{
        background: "color-mix(in srgb, var(--bg-surface) 95%, transparent)",
        borderColor: "var(--border-default)",
      }}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <SearchBar
          value={state.searchQuery}
          onChange={actions.setSearchQuery}
          onLocationSelect={actions.handleLocationSelect}
        />
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
          <FilterPills activeFilter={state.filter} onFilterChange={actions.setFilter} />
          <Button
            variant="secondary"
            size="sm"
            className="flex-shrink-0 relative"
            onClick={actions.openFilters}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {meta.activeFilterCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full"
                style={{ background: "var(--color-copper-500)", color: "white" }}
              >
                {meta.activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}

function ExploreMap() {
  const { state, actions } = useExplore();
  const { resolvedTheme } = useTheme();

  const isPropertySelected = useCallback(
    (property: Property) => {
      if (property.propertyType === "sale") {
        return state.comparisonSelection.buy?.id === property.id;
      }
      return state.comparisonSelection.rent?.id === property.id;
    },
    [state.comparisonSelection]
  );

  const renderPopup = useCallback(
    (property: Property) => (
      <PropertyCard
        property={property}
        onSelect={actions.selectPropertyForComparison}
        onClose={() => actions.setSelectedProperty(null)}
        isSelected={isPropertySelected(property)}
      />
    ),
    [actions, isPropertySelected]
  );

  return (
    <Suspense fallback={<MapSkeleton />}>
      <PropertyMap
        initialViewState={state.initialViewState}
        flyToLocation={state.flyToLocation}
        properties={state.properties}
        selectedProperty={state.selectedProperty}
        onPropertySelect={actions.setSelectedProperty}
        renderPopup={renderPopup}
        theme={resolvedTheme}
        onBoundsChange={actions.handleBoundsChange}
        onSearchArea={actions.handleSearchArea}
        isLoading={state.isLoading}
        isSearchInSync={state.isSearchInSync}
      />
    </Suspense>
  );
}

function PropertyCountBadge() {
  const { state } = useExplore();

  return (
    <Card padding="sm" className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 z-10">
      {state.isLoading ? (
        <Loader2 className="w-4 h-4 text-copper-400 animate-spin" />
      ) : (
        <MapPin className="w-4 h-4 text-copper-400" />
      )}
      <span className="text-xs sm:text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
        {state.isLoading ? "Searching..." : `${state.properties.length} properties`}
      </span>
    </Card>
  );
}

function InsightsToggle() {
  const { state, actions } = useExplore();

  if (state.showInsights) return null;

  return (
    <button onClick={actions.openInsights} className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
      <Card padding="sm" hover className="flex items-center gap-2 cursor-pointer">
        <TrendingUp className="w-4 h-4 text-copper-400" />
        <span className="text-xs sm:text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          <span className="hidden sm:inline">Market </span>Insights
        </span>
        <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
      </Card>
    </button>
  );
}

function ExploreInsightsPanel() {
  const { state, actions, meta } = useExplore();

  return (
    <MarketInsights
      isOpen={state.showInsights}
      onClose={actions.closeInsights}
      location={state.searchQuery}
      stats={meta.marketStats}
      isLoading={state.isLoading}
    />
  );
}

function ExploreFiltersPanel() {
  const { state, actions } = useExplore();

  return (
    <FiltersPanel
      isOpen={state.showFilters}
      onClose={actions.closeFilters}
      filters={state.filters}
      onFiltersChange={actions.setFilters}
      onApply={actions.applyFilters}
      activeFilterType={state.filter}
    />
  );
}

function ExploreComparisonTray() {
  const { state, actions, meta } = useExplore();
  const navigate = useNavigate();

  const handleCompare = useCallback(() => {
    const { buy, rent } = state.comparisonSelection;
    if (!buy || !rent) return;

    const newValues = {
      ...initialValues,
      homePrice: buy.price,
      monthlyRent: rent.price,
    };

    navigate({ to: "/", search: { q: encodeState(newValues) } });
  }, [state.comparisonSelection, navigate]);

  return (
    <ComparisonTray
      selection={state.comparisonSelection}
      onRemove={actions.removeFromComparison}
      onCompare={handleCompare}
      isVisible={meta.showComparisonTray}
    />
  );
}

// =============================================================================
// Main Page Content - Composed from smaller components
// =============================================================================

function ExplorePageContent() {
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col" style={{ background: "var(--bg-base)" }}>
      <ExploreHeader />
      
      <div className="flex-1 relative overflow-hidden">
        <ExploreMap />
        <PropertyCountBadge />
        <InsightsToggle />
        <ExploreInsightsPanel />
        <ExploreComparisonTray />
        <ExploreFiltersPanel />
      </div>
    </div>
  );
}

// =============================================================================
// Route Component - Provider wraps the content
// =============================================================================

function ExplorePage() {
  return (
    <ExploreProvider>
      <ExplorePageContent />
    </ExploreProvider>
  );
}

export const Route = createFileRoute("/explore")({
  component: ExplorePage,
  head: () => ({
    links: [
      // Prefetch map style JSON so MapLibre doesn't have to wait for it
      { rel: "prefetch", href: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json", as: "fetch", crossOrigin: "anonymous" },
      { rel: "prefetch", href: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json", as: "fetch", crossOrigin: "anonymous" },
    ],
  }),
  loader: () => {
    // Eagerly start downloading the heavy map chunk (~1MB) as soon as the
    // route is matched, before React renders the Suspense boundary.
    import("../components/explore/property-map");
  },
});
