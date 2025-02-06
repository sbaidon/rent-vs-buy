import React from "react";
import { useCalculator } from "../context/calculator-context";
import { BuyingCostsCalculator } from "../utils/buy-costs-calculator";
import { RentingCostsCalculator } from "../utils/rent-costs-calculator";
import { formatCurrency } from "../utils/format-currency";
import { useTranslation } from "react-i18next";
import { useAppContext } from "../context/app-context";

const Results = React.memo(() => {
  const { t } = useTranslation();
  const { values, reset } = useCalculator();
  const { currency } = useAppContext();

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

  return (
    <div
      className={`rounded-lg p-6 w-full shadow ${
        isRentingBetter ? "bg-acadia-200" : "bg-acadia-500"
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
        <p className="text-4xl text-acadia-950">
          <span className="text-4xl font-bold">
            {formatCurrency(Math.abs(savings), currency)}&nbsp;
          </span>
          {t("calculator.results.overYears", { years: values.yearsToStay })}
        </p>
      </div>

      <table className="w-full text-left text-acadia-950 border-collapse">
        <thead>
          <tr>
            <th className="pb-2">{t("calculator.results.costs")}</th>
            <th className="pb-2">{t("calculator.rent")}</th>
            <th className="pb-2">{t("calculator.results.buy")}</th>
          </tr>
        </thead>
        <tbody>
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
            <tr key={label} className="border-t border-acadia-900">
              <td className="py-2">{label}</td>
              <td
                className={`py-2 slashed-zero tabular-nums ${
                  (rent as number) > 0 ? "text-red-800" : "text-green-800"
                }`}
              >
                {formatCurrency(rent as number, currency)}
              </td>
              <td
                className={`py-2 slashed-zero tabular-nums ${
                  (buy as number) > 0 ? "text-red-800" : "text-green-800"
                }`}
              >
                {formatCurrency(buy as number, currency)}
              </td>
            </tr>
          ))}
          <tr className="border-t border-acadia-900">
            <td className="py-2">{t("calculator.results.total")}</td>
            <td
              className={`py-2 slashed-zero tabular-nums ${
                results.renting.totalCost > 0
                  ? "text-red-800"
                  : "text-green-800"
              }`}
            >
              {formatCurrency(results.renting.totalCost, currency)}
            </td>
            <td
              className={`py-2 slashed-zero tabular-nums ${
                results.buying.totalCost > 0 ? "text-red-800" : "text-green-800"
              }`}
            >
              {formatCurrency(results.buying.totalCost, currency)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-end mt-4">
        <button
          onClick={reset}
          className="px-4 py-2 text-sm font-medium text-acadia-950 rounded hover:bg-acadia-100 transition-colors cursor-pointer"
        >
          {t("calculator.reset")}
        </button>
      </div>
    </div>
  );
});

export default Results;
