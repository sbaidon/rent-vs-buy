import React from "react";
import { useCalculator } from "../context/calculator-context";
import { BuyingCostsCalculator } from "../utils/buy-costs-calculator";
import { RentingCostsCalculator } from "../utils/rent-costs-calculator";
import { formatCurrency } from "../utils/format-currency";
import { useTranslation } from "react-i18next";
import { useAppContext } from "../context/app-context";
import { AreaChart } from "./area-chart";
import Tooltip from "./tooltip";

const Results = React.memo(() => {
  const { t } = useTranslation();
  const { values, reset } = useCalculator();
  const { currency } = useAppContext();
  const [showToast, setShowToast] = React.useState(false);

  // New state to allow toggling between cumulative & non-cumulative yearly values
  const [cumulative, setCumulative] = React.useState(true);

  const results = React.useMemo(() => {
    const buyingCalculator = new BuyingCostsCalculator(values);
    const rentingCalculator = new RentingCostsCalculator(values);

    const buying = buyingCalculator.calculate();
    const renting = rentingCalculator.calculate();

    return {
      buying,
      renting,
    };
  }, [values]);

  const savings = React.useMemo(() => {
    return (
      Math.abs(results.buying.totalCost) - Math.abs(results.renting.totalCost)
    );
  }, [results]);

  const isRentingBetter = results.renting.totalCost < results.buying.totalCost;

  const yearlyData = React.useMemo(() => {
    const rentBreakdown = results.renting.yearlyBreakdown;
    const buyBreakdown = results.buying.yearlyBreakdown;

    // Create an array with cumulative sums from buyBreakdown.
    const aggregatedBuyBreakdown = buyBreakdown.reduce<number[]>(
      (acc, current) => {
        const lastSum = acc.length > 0 ? acc[acc.length - 1] : 0;
        acc.push(lastSum + current);
        return acc;
      },
      []
    );

    // Create an array with cumulative sums from rentBreakdown.
    const aggregatedRentBreakdown = rentBreakdown.reduce<number[]>(
      (acc, current) => {
        const lastSum = acc.length > 0 ? acc[acc.length - 1] : 0;
        acc.push(lastSum + current);
        return acc;
      },
      []
    );

    return new Array(values.yearsToStay).fill(0).map((_, index) => ({
      date: `Year ${index + 1}`,
      [t("calculator.rent")]: cumulative
        ? Math.abs(aggregatedRentBreakdown[index])
        : Math.abs(rentBreakdown[index]),
      [t("calculator.results.buy")]: cumulative
        ? aggregatedBuyBreakdown[index]
        : buyBreakdown[index],
    }));
  }, [results, values.yearsToStay, t, cumulative]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div className="p-8 lg:p-0 mx-auto max-w-[600px] lg:max-w-full flex flex-col gap-6 items-center">
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-acadia-950 text-acadia-100 px-4 py-2 rounded-lg shadow-lg transition-opacity z-0 isolate">
          {t("calculator.linkCopied")}
        </div>
      )}
      <div
        className={`max-h-[900px] rounded-lg p-6 w-full shadow ${
          isRentingBetter ? "bg-acadia-200" : "bg-acadia-400"
        } text-acadia-950`}
      >
        <div className={`p-4 mb-6 text-center`}>
          <h3 className="text-acadia-950">
            <span className="text-2xl underline decoration-wavy font-bold">
              {results.buying.totalCost > results.renting.totalCost
                ? t("calculator.results.renting")
                : t("calculator.results.buying")}
              &nbsp;
            </span>
            {t("calculator.results.savesYou")}
          </h3>
          <p className="text-2xl text-acadia-950">
            <span className="text-4xl font-bold">
              {formatCurrency(Math.abs(savings), currency)}&nbsp;
            </span>
            {t("calculator.results.overYears", { years: values.yearsToStay })}
          </p>
        </div>

        <div className="w-full text-acadia-950">
          <div className="grid grid-cols-3 text-left mb-2">
            <div className="font-semibold">{t("calculator.results.costs")}</div>
            <div className="font-semibold">{t("calculator.rent")}</div>
            <div className="font-semibold">{t("calculator.results.buy")}</div>
          </div>
          <div className="divide-y divide-acadia-900">
            {[
              [
                t("calculator.results.initialCosts"),
                results.renting.initialCost,
                results.buying.initialCost,
              ],
              [
                t("calculator.results.recurringCosts"),
                results.renting.recurringCost,
                results.buying.recurringCost,
              ],
              [
                t("calculator.results.opportunityCosts"),
                results.renting.opportunityCost,
                results.buying.opportunityCost,
              ],
              [
                t("calculator.results.netProceeds"),
                results.renting.netProceeds,
                results.buying.netProceeds,
              ],
            ].map(([label, rent, buy]) => (
              <div key={label} className="grid grid-cols-3 py-2">
                <p className="text-acadia-950">{label}</p>
                <div
                  className={`truncate slashed-zero tabular-nums ${
                    (rent as number) > 0 ? "text-red-800" : "text-green-800"
                  }`}
                >
                  {formatCurrency(rent as number, currency)}
                </div>
                <div
                  className={`truncate slashed-zero tabular-nums ${
                    (buy as number) > 0 ? "text-red-800" : "text-green-800"
                  }`}
                >
                  {formatCurrency(buy as number, currency)}
                </div>
              </div>
            ))}
            <div className="grid grid-cols-3 py-2">
              <div>{t("calculator.results.total")}</div>
              <div
                className={`truncate slashed-zero tabular-nums ${
                  results.renting.totalCost > 0
                    ? "text-red-800"
                    : "text-green-800"
                }`}
              >
                {formatCurrency(results.renting.totalCost, currency)}
              </div>
              <div
                className={`truncate slashed-zero tabular-nums ${
                  results.buying.totalCost > 0
                    ? "text-red-800"
                    : "text-green-800"
                }`}
              >
                {formatCurrency(results.buying.totalCost, currency)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-lg font-semibold mb-3 text-acadia-950 flex items-center">
            {t("calculator.results.monthlyBreakdown")}
            <Tooltip
              content={t("calculator.tooltips.monthlyPayment")}
              iconClassName="text-acadia-800"
            />
          </h4>
          <div className="w-full text-acadia-950">
            <div className="grid grid-cols-2 text-left mb-2">
              <div className="font-semibold">{t("calculator.rent")}</div>
              <div className="font-semibold">{t("calculator.results.buy")}</div>
            </div>
            <div className="border-t border-acadia-900">
              <div className="grid grid-cols-2 py-2">
                <div className="truncate slashed-zero tabular-nums text-red-800">
                  {formatCurrency(
                    results.renting.totalCost / (values.yearsToStay * 12),
                    currency
                  )}
                </div>
                <div className="truncate slashed-zero tabular-nums text-red-800">
                  {formatCurrency(
                    results.buying.totalCost / (values.yearsToStay * 12),
                    currency
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4 space-x-2">
          <button
            onClick={handleShare}
            className="px-4 py-2 text-sm font-medium text-acadia-950 rounded hover:bg-acadia-100 transition-colors cursor-pointer"
          >
            {t("calculator.share")}
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 text-sm font-medium text-acadia-950 rounded hover:bg-acadia-100 transition-colors cursor-pointer"
          >
            {t("calculator.reset")}
          </button>
        </div>
      </div>
      <div className="max-h-[500px] w-full rounded-lg p-6 bg-acadia-950 shadow text-acadia-100">
        <div className="flex-col lg:flex-row gap-4 lg:gap-0 flex justify-between items-center mb-3">
          <div className="flex items-baseline">
            <h4 className="lg font-semibold flex items-baseline">
              {t("calculator.results.yearBreakdown")}
            </h4>
            <Tooltip
              content={t("calculator.tooltips.yearBreakdown")}
              iconClassName="text-acadia-200"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="cumulative-toggle" className="text-sm">
              {t("calculator.results.runningTotal")}
            </label>
            <input
              id="cumulative-toggle"
              type="checkbox"
              checked={cumulative}
              onChange={() => setCumulative((prev) => !prev)}
            />
          </div>
        </div>
        <AreaChart
          className="p-4 w-full"
          data={yearlyData}
          index="date"
          allowDecimals
          categories={[t("calculator.rent"), t("calculator.results.buy")]}
          yAxisWidth={100}
          colors={["light", "dark"]}
          fill="solid"
          valueFormatter={(value) => formatCurrency(value, currency)}
        />
      </div>
    </div>
  );
});

export default Results;
