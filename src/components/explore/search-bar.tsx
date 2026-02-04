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
    <form onSubmit={handleSubmit} className="relative flex-1 max-w-xl">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full pl-12 pr-4 h-12 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm transition-all hover:border-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none"
        />
      </div>
    </form>
  );
});
