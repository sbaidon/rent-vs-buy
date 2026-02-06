import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { StrictMode, useState } from "react";
import { useTranslation } from "react-i18next";
import Calculator from "../components/calculator";
import { CalculatorProvider } from "../context/calculator-context";
import TabbedResults from "../components/tabbed-results";
import { ChevronDown, X } from "lucide-react";
import { calculatorSearchSchema } from "../schemas/calculator";

// ============================================================================
// Responsive Results Component
// ============================================================================

type ResponsiveResultsProps = {
  isMinimized: boolean;
  setIsMinimized: (isMinimized: boolean) => void;
};

function ResponsiveResults({
  isMinimized,
  setIsMinimized,
}: ResponsiveResultsProps) {
  const { t } = useTranslation();

  const toggleMinimized = () => {
    const newValue = !isMinimized;
    setIsMinimized(newValue);
    localStorage.setItem("resultsMinimized", JSON.stringify(newValue));
  };

  return (
    <div
      className={`
      w-full 
      lg:p-4 
      p-2
      ${
        !isMinimized
          ? "fixed inset-0 bg-[var(--bg-base)] z-50 lg:relative lg:inset-auto lg:bg-transparent lg:z-auto flex flex-col lg:block overflow-hidden lg:overflow-visible"
          : ""
      }
    `}
    >
      {/* Mobile header with close button - always visible at top */}
      {!isMinimized && (
        <div className="shrink-0 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] bg-[var(--bg-base)] border-b border-[var(--border-default)] lg:hidden">
          <h2 className="text-lg font-display text-[var(--text-primary)]">
            {t("calculator.results.title")}
          </h2>
          <button
            onClick={toggleMinimized}
            className="text-[var(--text-muted)] hover:bg-copper-500/20 hover:text-copper-400 rounded-full p-2 cursor-pointer transition-colors -mr-2"
            aria-label="Close results"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}
      {isMinimized && (
        <button
          className="cursor-pointer rounded p-3 w-full sm:w-1/2 text-white bg-copper-600 hover:bg-copper-500 flex items-center justify-center lg:hidden mx-auto font-medium uppercase tracking-wide text-sm shadow-lg shadow-copper-500/20 transition-all"
          onClick={toggleMinimized}
        >
          {t("calculator.results.show")}
        </button>
      )}
      <div className={`${isMinimized ? "hidden lg:block" : "flex-1 overflow-y-auto no-scrollbar"} p-2 sm:p-4 lg:p-0`}>
        <TabbedResults />
      </div>
    </div>
  );
}

// ============================================================================
// Home Page Component
// ============================================================================

function HomePage() {
  const { t } = useTranslation();
  const searchParams = Route.useSearch();

  // Always start minimized on mobile - user must tap to open
  // This prevents the results panel from blocking the calculator on load
  const [isMinimized, setIsMinimized] = useState(true);

  return (
    <StrictMode>
      <CalculatorProvider searchParams={searchParams}>
        <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto py-4 sm:py-8">
          <div className="w-full lg:w-3/5 px-4 sm:px-6">
            {/* Header section */}
            <div className="mb-6 sm:mb-8">
              <h1 className="text-[var(--text-primary)] mb-2">{t("calculator.title")}</h1>
              <div className="h-0.5 w-24 bg-gradient-to-r from-copper-500 to-transparent" />
            </div>
            
            {/* Methodology section */}
            <div className="w-full mb-6">
              <details className="group relative [&_summary::-webkit-details-marker]:hidden panel p-4">
                <summary
                  className="w-full flex justify-between items-center 
                    rounded transition-colors cursor-pointer 
                    [&::-webkit-details-marker]:hidden list-none"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm uppercase tracking-wide text-[var(--text-muted)]">
                      {t("calculator.methodology.title")}
                    </span>
                  </div>
                  <ChevronDown className="h-5 w-5 text-[var(--text-muted)] transform group-open:rotate-180 transition-transform" />
                </summary>
                <div className="mt-4 text-[var(--text-secondary)] border-t border-[var(--border-default)] pt-4">
                  <div className="prose prose-invert max-w-none">
                    <p
                      className="text-sm/7 text-justify"
                      dangerouslySetInnerHTML={{
                        __html: t("calculator.methodology.content"),
                      }}
                    />
                  </div>
                </div>
              </details>
            </div>
            
            {/* Calculator */}
            <div className={`${!isMinimized ? "blur-sm lg:blur-none" : ""}`}>
              <Calculator />
            </div>
          </div>
          
          {/* Results sidebar */}
          <div className="w-full lg:w-2/5 sticky lg:top-20 bottom-0 lg:self-start rounded-t-lg">
            <ResponsiveResults
              setIsMinimized={setIsMinimized}
              isMinimized={isMinimized}
            />
          </div>
        </div>
      </CalculatorProvider>
    </StrictMode>
  );
}

// Route definition with search params validation for URL state
// Uses Zod schema for type-safe, validated URL state
// IMPORTANT: Must be after the component definition since we reference HomePage
export const Route = createFileRoute("/")({
  validateSearch: zodValidator(calculatorSearchSchema),
  component: HomePage,
});
