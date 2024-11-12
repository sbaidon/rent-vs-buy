import React from 'react';
import { useCalculator } from '../context/CalculatorContext';

const Results: React.FC = () => {
  const { calculateResults, values } = useCalculator();
  const results = calculateResults();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="bg-blue-500 text-white p-6 rounded-lg mb-8">
        <h2 className="text-3xl font-bold mb-2">
          {results.buying.netWorth > results.renting.netWorth ? 'Buying' : 'Renting'} saves you
        </h2>
        <div className="text-4xl font-bold">
          {formatCurrency(Math.abs(results.buying.netWorth - results.renting.netWorth))}
        </div>
        <div className="text-xl mt-2">over 30 years</div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">Costs after 30 years</h3>
          <table className="w-full">
            <tbody className="divide-y">
              <tr>
                <td className="py-2">Initial costs</td>
                <td className="py-2 text-right">{formatCurrency(values.homePrice * values.downPayment)}</td>
              </tr>
              <tr>
                <td className="py-2">Recurring costs</td>
                <td className="py-2 text-right">{formatCurrency(results.buying.totalCost)}</td>
              </tr>
              <tr>
                <td className="py-2">Opportunity costs</td>
                <td className="py-2 text-right">{formatCurrency(results.buying.opportunityCost)}</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">Total</td>
                <td className="py-2 text-right font-semibold">{formatCurrency(results.buying.totalCost + results.buying.opportunityCost)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Home equity after 30 years</h3>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(results.buying.homeValue)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;