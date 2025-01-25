import Calculator from "./components/calculator";
import Results from "./components/results";
import { CalculatorProvider } from "./context/calculator-context";
import { Monitoring } from "react-scan/monitoring";

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8">
        <main className="flex gap-8">
          <CalculatorProvider>
            <div className="space-y-12">
              <Calculator />
            </div>
            <div className="w-[auto] sticky top-4 self-start">
              <Results />
            </div>
          </CalculatorProvider>
        </main>
      </div>
      <Monitoring
        apiKey="fIbgVe71jICFv6C2_0GdDX8saszFAUMU"
        url="https://monitoring.react-scan.com/api/v1/ingest"
        params={{}}
        path={"/"}
      />
    </div>
  );
}

export default App;
