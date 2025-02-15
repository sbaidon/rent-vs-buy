import "../../index.css";

import { StrictMode, useState, memo } from "react";
import { useTranslation } from "react-i18next";
import Calculator from "../../components/calculator";
import Results from "../../components/results";
import { ChevronDown, X } from "lucide-react";

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

function Page() {
  const { t } = useTranslation();
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("resultsMinimized");
      return stored !== null ? JSON.parse(stored) : true;
    }
    return true;
  });

  return (
    <StrictMode>
      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto lg:overflow">
        <div className="w-full lg:w-3/5 px-6">
          <h1>{t("calculator.title")}</h1>
          <div className="w-full">
            <details className="group">
              <summary className="w-full flex justify-between items-center mt-2 text-acadia-100 hover:opacity-80 rounded-lg transition-colors cursor-pointer [&::-webkit-details-marker]:hidden">
                <span className="font-medium text-lg">
                  {t("calculator.methodology.title")}
                </span>
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
            <Calculator />
          </div>
        </div>
        <div className="w-full lg:w-2/5 sticky lg:top-4 bottom-0 lg:self-start rounded-t-lg">
          <ResponsiveResults
            setIsMinimized={setIsMinimized}
            isMinimized={isMinimized}
          />
        </div>
      </div>
    </StrictMode>
  );
}

export default memo(Page);
