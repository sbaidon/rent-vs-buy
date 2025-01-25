import React from "react";
import { useCalculator } from "../context/calculator-context";
import { BuyingCostsCalculator } from "../utils/buy-costs-calculator";
import { RentingCostsCalculator } from "../utils/rent-costs-calculator";
import { formatCurrency } from "../utils/format-currency";

const Results = React.memo(() => {
  const { values } = useCalculator();

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

  const rentIsBetter = results.renting.totalCost < results.buying.totalCost;
  const color = rentIsBetter ? `bg-blue-500` : `bg-purple-500`;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
      <div className={`${color} text-white p-4 rounded-lg mb-6 text-center`}>
        <h2 className="text-2xl font-bold">
          {results.buying.totalCost > results.renting.totalCost
            ? "Renting saves you"
            : "Buying saves you"}
        </h2>
        <div className="text-4xl font-bold">
          {formatCurrency(Math.abs(savings))}
        </div>
        <div className="text-xl">over {values.yearsToStay} years</div>
      </div>

      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left pb-2">
              Costs after {values.yearsToStay} years
            </th>
            <th className="text-right pb-2">Rent</th>
            <th className="text-right pb-2">Buy</th>
          </tr>
        </thead>
        <tbody>
          {[
            [
              "Initial costs",
              results.renting.initialCost,
              results.buying.initialCost,
            ],
            [
              "Recurring costs",
              results.renting.recurringCost,
              results.buying.recurringCost,
            ],
            [
              "Opportunity costs",
              results.renting.opportunityCost,
              results.buying.opportunityCost,
            ],
            [
              "Net proceeds",
              results.renting.netProceeds,
              results.buying.netProceeds,
            ],
          ].map(([label, rent, buy]) => (
            <tr key={label} className="border-t border-gray-200">
              <td className="py-2 text-gray-600">{label}</td>
              <td className="py-2 text-right">
                {formatCurrency(rent as number)}
              </td>
              <td className="py-2 text-right">
                {formatCurrency(buy as number)}
              </td>
            </tr>
          ))}
          <tr className="border-t border-gray-200 font-bold">
            <td className="py-2">Total</td>
            <td className="py-2 text-right">
              {formatCurrency(results.renting.totalCost)}
            </td>
            <td className="py-2 text-right">
              {formatCurrency(results.buying.totalCost)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
});

export default Results;
