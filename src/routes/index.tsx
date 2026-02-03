import { createFileRoute } from "@tanstack/react-router";
import { StrictMode, useState } from "react";
import { useTranslation } from "react-i18next";
import Calculator from "../components/calculator";
import { CalculatorProvider } from "../context/calculator-context";
import Results from "../components/results";
import { ChevronDown, X, Table } from "lucide-react";
import AmortizationModal from "../components/amortization-modal";

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
          ? "fixed inset-0 bg-acadia-900 z-50 lg:relative lg:inset-auto lg:bg-transparent isolate overflow-y-auto lg:overflow-visible no-scrollbar"
          : ""
      }
    `}
    >
      <div className="flex items-center justify-between p-4 lg:hidden">
        {!isMinimized && (
          <>
            <h2 className="text-lg font-medium">
              {t("calculator.results.title")}
            </h2>
            <button
              onClick={toggleMinimized}
              className="text-white hover:bg-amber-100 hover:text-acadia-900 rounded-full p-2 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
      {isMinimized && (
        <button
          className="cursor-pointer rounded-lg p-2 w-1/2 text-white bg-acadia-900 hover:text-amber-100 flex items-center justify-center lg:hidden mx-auto"
          onClick={toggleMinimized}
        >
          {t("calculator.results.show")}
        </button>
      )}
      <div className={`${isMinimized ? "hidden lg:block" : ""}`}>
        <Results />
      </div>
    </div>
  );
}

// ============================================================================
// Home Page Component
// ============================================================================

function HomePage() {
  const { t } = useTranslation();
  const { q } = Route.useSearch();

  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("resultsMinimized");
      return stored !== null ? JSON.parse(stored) : true;
    }
    return true;
  });
  const [isAmortizationModalOpen, setIsAmortizationModalOpen] = useState(false);

  return (
    <StrictMode>
      <CalculatorProvider initialEncodedState={q}>
        <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto lg:overflow">
          <div className="w-full lg:w-3/5 px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
              <h1 className="mb-2 sm:mb-0">{t("calculator.title")}</h1>
              <button
                onClick={() => setIsAmortizationModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-acadia-800 rounded hover:bg-acadia-700 text-acadia-100 hover:text-white transition-colors duration-200 self-start sm:self-center"
              >
                <Table className="h-5 w-5" />
                <span>{t("calculator.amortization.view_schedule")}</span>
              </button>
            </div>
            <div className="w-full">
              <details className="group relative [&_summary::-webkit-details-marker]:hidden">
                <summary
                  className="w-full flex justify-between items-center text-acadia-100 
                    rounded-lg transition-colors cursor-pointer 
                    [&::-webkit-details-marker]:hidden list-none"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-lg">
                      {t("calculator.methodology.title")}
                    </span>
                  </div>
                  <ChevronDown className="h-5 w-5 transform group-open:rotate-180 transition-transform" />
                </summary>
                <div className="mt-2 text-acadia-100 rounded-lg">
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
            <div className={`${!isMinimized ? "blur-sm lg:blur-none" : ""}`}>
              <Calculator
                onOpenAmortizationModal={() => setIsAmortizationModalOpen(true)}
              />
            </div>
          </div>
          <div className="w-full lg:w-2/5 sticky lg:top-4 bottom-0 lg:self-start rounded-t-lg">
            <ResponsiveResults
              setIsMinimized={setIsMinimized}
              isMinimized={isMinimized}
            />
          </div>
        </div>
        <AmortizationModal
          isOpen={isAmortizationModalOpen}
          onClose={() => setIsAmortizationModalOpen(false)}
        />
      </CalculatorProvider>
    </StrictMode>
  );
}

// Route definition with search params validation for URL state
// IMPORTANT: Must be after the component definition since we reference HomePage
export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  component: HomePage,
});
