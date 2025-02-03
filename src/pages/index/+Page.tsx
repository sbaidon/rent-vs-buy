import "../../index.css";

import { StrictMode, useState, memo } from "react";
import { useTranslation } from "react-i18next";
import Calculator from "../../components/calculator";
import Results from "../../components/results";

function ResponsiveResults() {
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("resultsMinimized");
      return stored !== null ? JSON.parse(stored) : true;
    }
    return true;
  });
  const { t } = useTranslation();

  const toggleMinimized = () => {
    const newValue = !isMinimized;
    setIsMinimized(newValue);
    localStorage.setItem("resultsMinimized", JSON.stringify(newValue));
  };

  return (
    <div className="w-full lg:w-1/3 sticky lg:top-4 bottom-0 lg:self-start bg-amber-900/50 rounded-t-lg lg:rounded-lg">
      <button
        className="w-full p-2 text-amber-200 hover:text-amber-100 flex items-center justify-center lg:hidden"
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

  return (
    <StrictMode>
      <div className="pr-6 w-full lg:w-2/3">
        <h1>{t("calculator.title")}</h1>
        <p
          className="pt-4 text-justify"
          dangerouslySetInnerHTML={{ __html: t("calculator.about") }}
        />
        <Calculator />
      </div>
      <ResponsiveResults />
    </StrictMode>
  );
}

export default memo(Page);
