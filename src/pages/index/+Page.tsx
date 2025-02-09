import "../../index.css";

import { StrictMode, useState, memo } from "react";
import { useTranslation } from "react-i18next";
import Calculator from "../../components/calculator";
import Results from "../../components/results";

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
    <div className="w-full">
      <button
        className="rounded-lg bg-acadia-950 w-full p-2 text-white hover:text-amber-100 flex items-center justify-center lg:hidden"
        onClick={toggleMinimized}
      >
        {isMinimized
          ? t("calculator.results.show")
          : t("calculator.results.hide")}
      </button>
      <div
        className={`transition-all duration-300 ${
          isMinimized ? "hidden lg:block" : ""
        }`}
      >
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
      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
        <div className="w-full lg:w-2/3 px-6 overflow-hidden">
          <h1>{t("calculator.title")}</h1>
          <p
            className="pt-4 text-justify"
            dangerouslySetInnerHTML={{ __html: t("calculator.about") }}
          />
          <div className={`${!isMinimized ? "blur-sm lg:blur-none" : ""}`}>
            <Calculator />
          </div>
        </div>
        <div className="w-full lg:w-1/3 sticky lg:top-4 bottom-0 lg:self-start rounded-t-lg lg:rounded-lg lg:mr-6">
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
