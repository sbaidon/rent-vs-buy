import { memo, useCallback, useState, useRef, useTransition, type FormEvent } from "react";
import { Search, MapPin, Loader2, ArrowRight } from "lucide-react";

export interface LocationResult {
  displayName: string;
  lat: number;
  lng: number;
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onLocationSelect?: (location: LocationResult) => void;
  placeholder?: string;
}

// Geocoding using Nominatim (OpenStreetMap) - called only on user action
async function searchLocations(query: string): Promise<LocationResult[]> {
  if (!query || query.length < 2) return [];
  
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=us`,
    { headers: { "Accept-Language": "en" } }
  );
  
  if (!response.ok) return [];
  
  const data: Array<{ display_name: string; lat: string; lon: string }> = await response.json();
  return data.map((item) => ({
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
  }));
}

/**
 * Search bar with location autocomplete
 * Uses useTransition for non-blocking search
 */
export const SearchBar = memo(function SearchBar({
  value,
  onChange,
  onSearch,
  onLocationSelect,
  placeholder = "Search by city, neighborhood, or ZIP",
}: SearchBarProps) {
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setShowSuggestions(false);
      if (suggestions.length > 0) {
        onLocationSelect?.(suggestions[0]);
      } else {
        onSearch();
      }
    },
    [onSearch, onLocationSelect, suggestions]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      
      // Clear previous debounce
      if (debounceRef.current) clearTimeout(debounceRef.current);
      
      if (newValue.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      
      // Debounce search with transition for non-blocking UI
      debounceRef.current = setTimeout(() => {
        startTransition(async () => {
          try {
            console.log("[SearchBar] Searching for:", newValue);
            const results = await searchLocations(newValue);
            console.log("[SearchBar] Got results:", results.length);
            setSuggestions(results);
            setShowSuggestions(results.length > 0);
          } catch (err) {
            console.error("[SearchBar] Search error:", err);
          }
        });
      }, 300);
    },
    [onChange]
  );

  const handleSelectLocation = useCallback(
    (location: LocationResult) => {
      const parts = location.displayName.split(", ");
      const shortName = parts.slice(0, 2).join(", ");
      onChange(shortName);
      setShowSuggestions(false);
      setSuggestions([]);
      onLocationSelect?.(location);
    },
    [onChange, onLocationSelect]
  );

  const handleBlur = useCallback(() => {
    // Delay to allow click on suggestion
    setTimeout(() => setShowSuggestions(false), 150);
  }, []);

  return (
    <div className="relative flex-1 sm:max-w-xl w-full">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          {isPending ? (
            <Loader2 
              className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 pointer-events-none animate-spin"
              style={{ color: "var(--text-muted)" }}
            />
          ) : (
            <Search 
              className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 pointer-events-none"
              style={{ color: "var(--text-muted)" }}
            />
          )}
          <input
            type="text"
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="input pl-10 sm:pl-12 pr-4 h-10 sm:h-12 text-sm sm:text-base w-full"
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary h-10 sm:h-12 px-4 flex items-center gap-2 whitespace-nowrap"
          disabled={!value.trim()}
        >
          <span className="hidden sm:inline">Go</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
      
      {showSuggestions && (
        <ul
          className="absolute top-full left-0 right-0 mt-2 rounded-lg border shadow-lg overflow-hidden z-50"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
        >
          {suggestions.map((location) => {
            const parts = location.displayName.split(", ");
            return (
              <li
                key={`${location.lat}-${location.lng}`}
                className="cursor-pointer px-4 py-3 flex items-start gap-3 hover:bg-[var(--bg-elevated)]"
                onMouseDown={() => handleSelectLocation(location)}
              >
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {parts[0]}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    {parts.slice(1, 3).join(", ")}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
