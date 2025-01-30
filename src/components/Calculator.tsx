import React, { useCallback } from "react";
import { CalculatorValues, useCalculator } from "../context/calculator-context";
import FlameGraph from "./flame-graph";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../context/currency-context";
import { formatCurrency } from "../utils/format-currency";

const Calculator: React.FC = () => {
  const { values, updateValue } = useCalculator();
  const { t } = useTranslation();
  const { currency } = useCurrency();

  const formatPercentage = useCallback(
    (value: number) => `${(value * 100).toFixed(2)}%`,
    []
  );

  const formatCurrencyValue = useCallback(
    (value: number) => formatCurrency(value, currency),
    [currency]
  );

  // Create a memoized handler factory
  const createChangeHandler = useCallback(
    (parameter: keyof CalculatorValues) => (value: number) =>
      updateValue(parameter, value),
    [updateValue]
  );

  return (
    <>
      <section className="pt-12">
        <div className="space-y-12">
          <div>
            <FlameGraph
              value={values.homePrice}
              parameter="homePrice"
              min={100000}
              max={2000000}
              step={10000}
              onChange={createChangeHandler("homePrice")}
              format={formatCurrencyValue}
              label={t("calculator.sections.basics.homePrice")}
            />
          </div>

          <div>
            <FlameGraph
              value={values.monthlyRent}
              parameter="monthlyRent"
              min={500}
              max={10000}
              step={100}
              onChange={createChangeHandler("monthlyRent")}
              format={formatCurrencyValue}
              label={t("calculator.sections.basics.monthlyRent")}
            />
          </div>
        </div>
      </section>

      <section className="pt-12">
        <h2 className="mb-4">{t("calculator.sections.mortgage.title")}</h2>
        <div className="space-y-8">
          <div>
            <FlameGraph
              value={values.mortgageRate}
              parameter="mortgageRate"
              min={0}
              max={0.15}
              step={0.001}
              onChange={createChangeHandler("mortgageRate")}
              format={formatPercentage}
              label={t("calculator.sections.mortgage.rate")}
            />
          </div>

          <div>
            <FlameGraph
              value={values.downPayment}
              parameter="downPayment"
              min={0}
              max={1}
              step={0.01}
              onChange={createChangeHandler("downPayment")}
              format={formatPercentage}
              label={t("calculator.sections.mortgage.downPayment")}
            />
          </div>

          <div>
            <FlameGraph
              value={values.yearsToStay}
              parameter="yearsToStay"
              min={1}
              max={40}
              step={1}
              onChange={createChangeHandler("yearsToStay")}
              format={(v) => `${v} ${t("years")}`}
              label={t("calculator.sections.mortgage.yearsToStay")}
            />
          </div>

          <div>
            <FlameGraph
              value={values.mortgageTerm}
              parameter="mortgageTerm"
              min={1}
              max={30}
              step={1}
              onChange={createChangeHandler("mortgageTerm")}
              format={(v) => `${v} ${t("years")}`}
              label={t("calculator.sections.mortgage.mortgageLength")}
            />
          </div>

          <div>
            <FlameGraph
              value={values.pmi}
              parameter="pmi"
              min={0}
              max={0.1}
              step={0.01}
              onChange={createChangeHandler("pmi")}
              format={formatPercentage}
              label={t("calculator.sections.mortgage.pmi")}
            />
          </div>
        </div>
      </section>

      <section className="pt-12">
        <h2 className="mb-4">{t("calculator.sections.future.title")}</h2>
        <div className="space-y-12">
          {/* Future projections section */}
          <div>
            <div className="space-y-8">
              <FlameGraph
                value={values.homePriceGrowth}
                parameter="homePriceGrowth"
                min={-0.05}
                max={0.15}
                step={0.001}
                onChange={createChangeHandler("homePriceGrowth")}
                format={formatPercentage}
                label={t("calculator.sections.future.homePriceGrowth")}
              />

              <FlameGraph
                value={values.rentGrowth}
                parameter="rentGrowth"
                min={-0.05}
                max={0.9}
                step={0.01}
                onChange={createChangeHandler("rentGrowth")}
                format={formatPercentage}
                label={t("calculator.sections.future.rentGrowth")}
              />

              <FlameGraph
                value={values.investmentReturn}
                parameter="investmentReturn"
                min={-0.9}
                max={0.9}
                step={0.01}
                onChange={createChangeHandler("investmentReturn")}
                format={formatPercentage}
                label={t("calculator.sections.future.investmentReturn")}
              />

              <FlameGraph
                value={values.inflationRate}
                parameter="inflationRate"
                min={-0.05}
                max={0.1}
                step={0.001}
                onChange={createChangeHandler("inflationRate")}
                format={formatPercentage}
                label={t("calculator.sections.future.inflationRate")}
              />
            </div>
          </div>

          {/* Tax section */}
          <div>
            <h2 className="900 mb-2">{t("calculator.sections.taxes.title")}</h2>
            <div className="space-y-8">
              <div className="flex items-center space-x-4 mb-4">
                <p>{t("calculator.sections.taxes.filingType")}</p>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    checked={!values.isJointReturn}
                    onChange={() => updateValue("isJointReturn", false)}
                  />
                  <span className="text-acadia-100 ml-2">
                    {t("calculator.sections.taxes.individual")}
                  </span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    checked={values.isJointReturn}
                    onChange={() => updateValue("isJointReturn", true)}
                  />
                  <span className="text-acadia-100 ml-2">
                    {t("calculator.sections.taxes.joint")}
                  </span>
                </label>
              </div>

              <FlameGraph
                value={values.propertyTaxRate}
                parameter="propertyTaxRate"
                min={0}
                max={0.1}
                step={0.001}
                onChange={createChangeHandler("propertyTaxRate")}
                format={formatPercentage}
                label={t("calculator.sections.taxes.propertyTaxRate")}
              />

              <FlameGraph
                value={values.marginalTaxRate}
                parameter="marginalTaxRate"
                min={0}
                max={0.5}
                step={0.01}
                onChange={createChangeHandler("marginalTaxRate")}
                format={formatPercentage}
                label={t("calculator.sections.taxes.marginalTaxRate")}
              />

              <FlameGraph
                value={values.otherDeductions}
                parameter="otherDeductions"
                min={0}
                max={100000}
                step={1000}
                onChange={createChangeHandler("otherDeductions")}
                format={formatCurrencyValue}
                label={t("calculator.sections.taxes.otherDeductions")}
              />

              <div className="flex items-center space-x-4">
                <p>{t("calculator.sections.taxes.taxCutsQuestion")}</p>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    checked={values.taxCutsExpire}
                    onChange={() => updateValue("taxCutsExpire", true)}
                  />
                  <span className="text-acadia-100 ml-2">
                    {t("calculator.sections.taxes.expire")}
                  </span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    checked={!values.taxCutsExpire}
                    onChange={() => updateValue("taxCutsExpire", false)}
                  />
                  <span className="text-acadia-100 ml-2">
                    {t("calculator.sections.taxes.renew")}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Closing costs section */}
          <div>
            <h2 className="mb-2">
              {t("calculator.sections.closingCosts.title")}
            </h2>
            <div className="space-y-8">
              <FlameGraph
                parameter="buyingCosts"
                value={values.buyingCosts}
                min={0}
                max={0.1}
                step={0.001}
                onChange={createChangeHandler("buyingCosts")}
                format={formatPercentage}
                label={t("calculator.sections.closingCosts.buyingCosts")}
              />

              <FlameGraph
                parameter="sellingCosts"
                value={values.sellingCosts}
                min={0}
                max={0.1}
                step={0.001}
                onChange={createChangeHandler("sellingCosts")}
                format={formatPercentage}
                label={t("calculator.sections.closingCosts.sellingCosts")}
              />
            </div>
          </div>

          {/* Maintenance and fees section */}
          <div>
            <h2 className="mb-2">
              {t("calculator.sections.maintenance.title")}
            </h2>
            <div className="space-y-8">
              <FlameGraph
                value={values.maintenanceRate}
                min={0}
                max={0.1}
                step={0.001}
                onChange={createChangeHandler("maintenanceRate")}
                format={formatPercentage}
                label={t("calculator.sections.maintenance.maintenanceRate")}
                parameter="maintenanceRate"
              />

              <FlameGraph
                value={values.homeInsuranceRate}
                min={0}
                max={0.1}
                step={0.001}
                onChange={createChangeHandler("homeInsuranceRate")}
                format={formatPercentage}
                label={t("calculator.sections.maintenance.insurance")}
                parameter="homeInsuranceRate"
              />

              <FlameGraph
                value={values.extraPayments}
                min={0}
                max={2000}
                step={50}
                onChange={createChangeHandler("extraPayments")}
                format={formatCurrencyValue}
                label={t("calculator.sections.maintenance.extraPayments")}
                parameter="extraPayments"
              />
            </div>
          </div>

          {/* Additional renting costs section */}
          <div>
            <h2 className="mb-2">
              {t("calculator.sections.rentingCosts.title")}
            </h2>

            <div className="space-y-8">
              <FlameGraph
                parameter="securityDeposit"
                value={values.securityDeposit}
                min={0}
                max={12}
                step={1}
                onChange={createChangeHandler("securityDeposit")}
                format={(v) => `${v} ${v === 1 ? t("month") : t("months")}`}
                label={t("calculator.sections.rentingCosts.securityDeposit")}
              />

              <FlameGraph
                parameter="brokerFee"
                value={values.brokerFee}
                min={0}
                max={0.5}
                step={0.01}
                onChange={createChangeHandler("brokerFee")}
                format={formatPercentage}
                label={t("calculator.sections.rentingCosts.brokerFee")}
              />

              <FlameGraph
                parameter="monthlyRentersInsurance"
                value={values.monthlyRentersInsurance}
                min={0}
                max={1000}
                step={10}
                onChange={createChangeHandler("monthlyRentersInsurance")}
                format={formatCurrencyValue}
                label={t(
                  "calculator.sections.rentingCosts.monthlyRentersInsurance"
                )}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Calculator;
