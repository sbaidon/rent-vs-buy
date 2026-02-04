import { memo, useCallback, type FormEvent } from "react";
import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
}

/**
 * Search bar component for location search
 * Memoized to prevent re-renders when unrelated parent state changes
 */
export const SearchBar = memo(function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Search by city, neighborhood, or ZIP",
}: SearchBarProps) {
  // Use callback to prevent function recreation
  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      onSearch();
    },
    [onSearch]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <form onSubmit={handleSubmit} className="relative flex-1 sm:max-w-xl w-full">
      <div className="relative">
        <Search 
          className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 pointer-events-none"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="input pl-10 sm:pl-12 pr-4 h-10 sm:h-12 text-sm sm:text-base"
        />
      </div>
    </form>
  );
});
