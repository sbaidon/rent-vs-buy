import Calculator from "./components/calculator";
import Results from "./components/results";
import { CalculatorProvider } from "./context/calculator-context";
import { Monitoring } from "react-scan/monitoring";
import { useTranslation } from "react-i18next";
import { CurrencyProvider, useCurrency } from "./context/currency-context";
import { useState } from "react";

function Navbar({
  changeLanguage,
  language,
}: {
  changeLanguage: (lng: string) => void;
  language: string;
}) {
  const { setCurrency } = useCurrency();

  return (
    <div className="flex justify-end gap-4 p-6">
      <select
        onChange={(e) => setCurrency(e.target.value)}
        className="mb-4 px-3 py-1 rounded bg-transparent text-white cursor-pointer"
        defaultValue="USD"
      >
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
        <option value="MXN">MXN</option>
      </select>
      <select
        onChange={(e) => changeLanguage(e.target.value)}
        className="mb-4 px-3 py-1 rounded bg-transparent text-white cursor-pointer"
        value={language}
      >
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
      <div className="flex items-center gap-2 relative">
        <select
          className="mb-4 px-3 py-1 rounded bg-transparent text-white cursor-pointer"
          defaultValue="US"
        >
          <option value="US">United States</option>
        </select>
        <span className="absolute -top-2 -right-2 bg-amber-700/50 text-amber-200 text-xs px-2 py-1 rounded-full">
          More countries soon
        </span>
      </div>
    </div>
  );
}

function ResponsiveResults() {
  const [isMinimized, setIsMinimized] = useState(() => {
    const stored = localStorage.getItem("resultsMinimized");
    return stored !== null ? JSON.parse(stored) : true;
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

function App() {
  const { t, i18n } = useTranslation();

  return (
    <CurrencyProvider>
      <CalculatorProvider>
        <div className="min-h-screen bg-linear-to-br/oklab from-amber-950 to-amber-600">
          <Navbar
            changeLanguage={i18n.changeLanguage}
            language={i18n.language}
          />
          <main className="p-4 flex justify-between flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
            <div className="pr-6 w-full lg:w-2/3">
              <h1>{t("calculator.title")}</h1>
              <p
                className="pt-4 text-justify"
                dangerouslySetInnerHTML={{ __html: t("calculator.about") }}
              />
              <Calculator />
            </div>
            <ResponsiveResults />
          </main>
          <Monitoring
            apiKey="fIbgVe71jICFv6C2_0GdDX8saszFAUMU"
            url="https://monitoring.react-scan.com/api/v1/ingest"
            path={"/"}
          />
        </div>
      </CalculatorProvider>
    </CurrencyProvider>
  );
}

export default App;
