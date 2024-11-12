import React from 'react';
import { useCalculator } from '../context/CalculatorContext';
import FlameGraph from './FlameGraph';
import Results from './Results';

const Calculator: React.FC = () => {
  const { values, updateValue } = useCalculator();

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);

  const formatPercentage = (value: number) =>
    `${(value * 100).toFixed(2)}%`;

  const calculateMonthlyPayment = () => {
    const principal = values.homePrice * (1 - values.downPayment);
    const monthlyRate = values.mortgageRate / 12;
    const numberOfPayments = 360; // 30 years * 12 months
    
    const monthlyPayment = principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    
    return formatCurrency(monthlyPayment);
  };

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">The Basics</h1>
        <p className="text-gray-600 mb-8">
          Adjust these numbers to get an estimate for your situation. These are some of the most important
          factors in your decision, and they're the only ones we can't estimate for you.
        </p>

        <div className="space-y-12">
          {/* Basic inputs section */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Home Price, if You Buy</h2>
            <p className="text-gray-600 mb-4">
              A very important factor, but not the only one. Our estimate will improve as you enter more details below.
            </p>
            <FlameGraph
              value={values.homePrice}
              min={100000}
              max={2000000}
              step={10000}
              onChange={(v) => updateValue('homePrice', v)}
              format={formatCurrency}
              label="Home price"
            />
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Monthly Rent, if You Rent</h2>
            <p className="text-gray-600 mb-4">
              Setting a target rent allows for a direct comparison of potential costs.
            </p>
            <FlameGraph
              value={values.monthlyRent}
              min={500}
              max={10000}
              step={100}
              onChange={(v) => updateValue('monthlyRent', v)}
              format={formatCurrency}
              label="Monthly rent"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-4xl font-bold text-gray-900 mb-4">What Are Your Mortgage Details?</h2>
        <p className="text-gray-600 mb-8">
          The calculator assumes you have a fixed-rate mortgage. It also calculates your main opportunity cost 
          of buying — the amount you could have earned by investing the down payment instead — and checks 
          whether you can take advantage of the mortgage-interest tax deduction.
        </p>

        <div className="space-y-8">
          <div>
            <FlameGraph
              value={values.mortgageRate}
              min={0}
              max={0.15}
              step={0.00125}
              onChange={(v) => updateValue('mortgageRate', v)}
              format={formatPercentage}
              label="Mortgage rate"
              sublabel={`${calculateMonthlyPayment()} per month`}
              leftColor="rgb(139, 92, 246)"
              rightColor="rgb(59, 130, 246)"
            />
          </div>

          <div>
            <FlameGraph
              value={values.downPayment}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateValue('downPayment', v)}
              format={formatPercentage}
              label="Down payment"
              sublabel={formatCurrency(values.homePrice * values.downPayment)}
              leftColor="rgb(59, 130, 246)"
              rightColor="rgb(139, 92, 246)"
            />
          </div>

          <div>
            <FlameGraph
              value={values.yearsToStay}
              min={1}
              max={40}
              step={1}
              onChange={(v) => updateValue('yearsToStay', v)}
              format={(v) => `${v} years`}
              label="Length of mortgage"
              leftColor="rgb(139, 92, 246)"
              rightColor="rgb(59, 130, 246)"
            />
          </div>

          <div>
            <FlameGraph
              value={0}
              min={0}
              max={0.02}
              step={0.0001}
              onChange={(v) => updateValue('pmi', v)}
              format={formatPercentage}
              label="Private mortgage insurance"
              sublabel={formatCurrency(0)}
              leftColor="rgb(59, 130, 246)"
              rightColor="rgb(139, 92, 246)"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Advanced Options</h2>
        <p className="text-gray-600 mb-8">
          Some of these inputs will matter a lot, and others less. We've filled in some reasonable guesses for you to start.
        </p>

        <div className="space-y-12">
          {/* Future projections section */}
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">What Does the Future Hold?</h3>
            <p className="text-gray-600 mb-6">
              How much home prices, rents and stock prices change can have a large impact on your outcome.
              Unfortunately, these are some of the hardest things to predict and can vary significantly across the country.
            </p>

            <div className="space-y-8">
              <FlameGraph
                value={values.homePriceGrowth}
                min={-0.05}
                max={0.15}
                step={0.001}
                onChange={(v) => updateValue('homePriceGrowth', v)}
                format={formatPercentage}
                label="Home price growth rate"
              />

              <FlameGraph
                value={values.rentGrowth}
                min={-0.05}
                max={0.15}
                step={0.001}
                onChange={(v) => updateValue('rentGrowth', v)}
                format={formatPercentage}
                label="Rent growth rate"
              />

              <FlameGraph
                value={values.investmentReturn}
                min={-0.10}
                max={0.20}
                step={0.001}
                onChange={(v) => updateValue('investmentReturn', v)}
                format={formatPercentage}
                label="Investment return rate"
              />

              <FlameGraph
                value={values.inflationRate}
                min={-0.05}
                max={0.10}
                step={0.001}
                onChange={(v) => updateValue('inflationRate', v)}
                format={formatPercentage}
                label="Inflation rate"
              />
            </div>
          </div>

          {/* Tax section */}
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Taxes</h3>
            <p className="text-gray-600 mb-6">
              Property taxes and mortgage-interest costs are significant but also deductible. The higher
              your marginal tax rate, the bigger the deduction.
            </p>

            <div className="space-y-8">
              <div className="flex items-center space-x-4 mb-4">
                <span className="text-gray-700">How you file your taxes:</span>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    checked={!values.isJointReturn}
                    onChange={() => updateValue('isJointReturn', false)}
                  />
                  <span className="ml-2">Individual Return</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    checked={values.isJointReturn}
                    onChange={() => updateValue('isJointReturn', true)}
                  />
                  <span className="ml-2">Joint Return</span>
                </label>
              </div>

              <FlameGraph
                value={values.propertyTaxRate}
                min={0}
                max={0.10}
                step={0.0001}
                onChange={(v) => updateValue('propertyTaxRate', v)}
                format={formatPercentage}
                label="Property tax rate"
                sublabel={formatCurrency(values.homePrice * values.propertyTaxRate)}
              />

              <FlameGraph
                value={values.marginalTaxRate}
                min={0}
                max={0.50}
                step={0.01}
                onChange={(v) => updateValue('marginalTaxRate', v)}
                format={formatPercentage}
                label="Marginal tax rate"
              />

              <FlameGraph
                value={values.otherDeductions}
                min={0}
                max={100000}
                step={1000}
                onChange={(v) => updateValue('otherDeductions', v)}
                format={formatCurrency}
                label="Other itemized deductions"
              />

              <div className="flex items-center space-x-4">
                <span className="text-gray-700">Assume the 2017 Tax Cuts and Jobs Act will:</span>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    checked={values.taxCutsExpire}
                    onChange={() => updateValue('taxCutsExpire', true)}
                  />
                  <span className="ml-2">Expire</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    checked={!values.taxCutsExpire}
                    onChange={() => updateValue('taxCutsExpire', false)}
                  />
                  <span className="ml-2">Be renewed</span>
                </label>
              </div>
            </div>
          </div>

          {/* Closing costs section */}
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Closing Costs</h3>
            <p className="text-gray-600 mb-6">
              You'll have to pay a set of one-time fees when you buy your home, and also when you sell it.
            </p>

            <div className="space-y-8">
              <FlameGraph
                value={values.buyingCosts}
                min={0}
                max={0.10}
                step={0.001}
                onChange={(v) => updateValue('buyingCosts', v)}
                format={formatPercentage}
                label="Costs of buying home"
                sublabel={formatCurrency(values.homePrice * values.buyingCosts)}
              />

              <FlameGraph
                value={values.sellingCosts}
                min={0}
                max={0.10}
                step={0.001}
                onChange={(v) => updateValue('sellingCosts', v)}
                format={formatPercentage}
                label="Costs of selling home"
                sublabel={formatCurrency(values.homePrice * values.sellingCosts)}
              />
            </div>
          </div>

          {/* Maintenance and fees section */}
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Maintenance and Fees</h3>
            <p className="text-gray-600 mb-6">
              Owning a home comes with a variety of expenses, including fixing things and paying
              certain utility bills.
            </p>

            <div className="space-y-8">
              <FlameGraph
                value={values.maintenanceRate}
                min={0}
                max={0.10}
                step={0.001}
                onChange={(v) => updateValue('maintenanceRate', v)}
                format={formatPercentage}
                label="Maintenance/renovation"
                sublabel={formatCurrency(values.homePrice * values.maintenanceRate)}
              />

              <FlameGraph
                value={values.homeInsuranceRate}
                min={0}
                max={0.10}
                step={0.001}
                onChange={(v) => updateValue('homeInsuranceRate', v)}
                format={formatPercentage}
                label="Homeowner's insurance"
                sublabel={formatCurrency(values.homePrice * values.homeInsuranceRate)}
              />

              <FlameGraph
                value={values.extraUtilities}
                min={0}
                max={2000}
                step={50}
                onChange={(v) => updateValue('extraUtilities', v)}
                format={formatCurrency}
                label="Extra monthly utilities"
              />
            </div>
          </div>

          {/* Additional renting costs section */}
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Additional Renting Costs</h3>
            <p className="text-gray-600 mb-6">
              These are the costs on top of rent, such as the fee you pay to a broker and the
              opportunity cost on your security deposit.
            </p>

            <div className="space-y-8">
              <FlameGraph
                value={values.securityDeposit}
                min={0}
                max={12}
                step={1}
                onChange={(v) => updateValue('securityDeposit', v)}
                format={(v) => `${v} month${v === 1 ? '' : 's'}`}
                label="Security deposit"
                sublabel={formatCurrency(values.monthlyRent * values.securityDeposit)}
              />

              <FlameGraph
                value={values.brokerFee}
                min={0}
                max={0.50}
                step={0.01}
                onChange={(v) => updateValue('brokerFee', v)}
                format={formatPercentage}
                label="Broker's fee"
                sublabel={formatCurrency(values.monthlyRent * 12 * values.brokerFee)}
              />

              <FlameGraph
                value={values.rentersInsuranceRate}
                min={0}
                max={0.10}
                step={0.001}
                onChange={(v) => updateValue('rentersInsuranceRate', v)}
                format={formatPercentage}
                label="Renter's insurance"
                sublabel={formatCurrency(values.monthlyRent * 12 * values.rentersInsuranceRate)}
              />
            </div>
          </div>
        </div>
      </section>

      <Results />
    </div>
  );
};

export default Calculator;