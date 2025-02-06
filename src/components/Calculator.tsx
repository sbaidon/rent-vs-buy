import React, { useCallback } from "react";
import { CalculatorValues, useCalculator } from "../context/calculator-context";
import FlameGraph from "./flame-graph";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "../utils/format-currency";
import { useAppContext } from "../context/app-context";
import { INPUT_CONFIG_PER_COUNTRY } from "../config/calculator-config";

const Calculator: React.FC = () => {
  const { values, updateValue } = useCalculator();
  const { t } = useTranslation();
  const { currency, country } = useAppContext();

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

  // Get the ranges for the current country
  const ranges = INPUT_CONFIG_PER_COUNTRY[country];

  return (
    <>
      <section className="pt-12">
        <div className="space-y-12">
          <div>
            <FlameGraph
              value={values.homePrice}
              parameter="homePrice"
              min={ranges.homePrice.min}
              max={ranges.homePrice.max}
              step={ranges.homePrice.step}
              onChange={createChangeHandler("homePrice")}
              format={formatCurrencyValue}
              label={t("calculator.sections.basics.homePrice")}
            />
          </div>

          <div>
            <FlameGraph
              value={values.monthlyRent}
              parameter="monthlyRent"
              min={ranges.monthlyRent.min}
              max={ranges.monthlyRent.max}
              step={ranges.monthlyRent.step}
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
              min={ranges.mortgageRate.min}
              max={ranges.mortgageRate.max}
              step={ranges.mortgageRate.step}
              onChange={createChangeHandler("mortgageRate")}
              format={formatPercentage}
              label={t("calculator.sections.mortgage.rate")}
            />
          </div>

          <div>
            <FlameGraph
              value={values.downPayment}
              parameter="downPayment"
              min={ranges.downPayment.min}
              max={ranges.downPayment.max}
              step={ranges.downPayment.step}
              onChange={createChangeHandler("downPayment")}
              format={formatPercentage}
              label={t("calculator.sections.mortgage.downPayment")}
            />
          </div>

          <div>
            <FlameGraph
              value={values.yearsToStay}
              parameter="yearsToStay"
              min={ranges.yearsToStay.min}
              max={ranges.yearsToStay.max}
              step={ranges.yearsToStay.step}
              onChange={createChangeHandler("yearsToStay")}
              format={(v) => `${v} ${t("years")}`}
              label={t("calculator.sections.mortgage.yearsToStay")}
            />
          </div>

          <div>
            <FlameGraph
              value={values.mortgageTerm}
              parameter="mortgageTerm"
              min={ranges.mortgageTerm.min}
              max={ranges.mortgageTerm.max}
              step={ranges.mortgageTerm.step}
              onChange={createChangeHandler("mortgageTerm")}
              format={(v) => `${v} ${t("years")}`}
              label={t("calculator.sections.mortgage.mortgageLength")}
            />
          </div>

          <div>
            <FlameGraph
              value={values.pmi}
              parameter="pmi"
              min={ranges.pmi.min}
              max={ranges.pmi.max}
              step={ranges.pmi.step}
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
                min={ranges.homePriceGrowth.min}
                max={ranges.homePriceGrowth.max}
                step={ranges.homePriceGrowth.step}
                onChange={createChangeHandler("homePriceGrowth")}
                format={formatPercentage}
                label={t("calculator.sections.future.homePriceGrowth")}
              />

              <FlameGraph
                value={values.rentGrowth}
                parameter="rentGrowth"
                min={ranges.rentGrowth.min}
                max={ranges.rentGrowth.max}
                step={ranges.rentGrowth.step}
                onChange={createChangeHandler("rentGrowth")}
                format={formatPercentage}
                label={t("calculator.sections.future.rentGrowth")}
              />

              <FlameGraph
                value={values.investmentReturn}
                parameter="investmentReturn"
                min={ranges.investmentReturn.min}
                max={ranges.investmentReturn.max}
                step={ranges.investmentReturn.step}
                onChange={createChangeHandler("investmentReturn")}
                format={formatPercentage}
                label={t("calculator.sections.future.investmentReturn")}
              />

              <FlameGraph
                value={values.inflationRate}
                parameter="inflationRate"
                min={ranges.inflationRate.min}
                max={ranges.inflationRate.max}
                step={ranges.inflationRate.step}
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
                min={ranges.propertyTaxRate.min}
                max={ranges.propertyTaxRate.max}
                step={ranges.propertyTaxRate.step}
                onChange={createChangeHandler("propertyTaxRate")}
                format={formatPercentage}
                label={t("calculator.sections.taxes.propertyTaxRate")}
              />

              <FlameGraph
                value={values.marginalTaxRate}
                parameter="marginalTaxRate"
                min={ranges.marginalTaxRate.min}
                max={ranges.marginalTaxRate.max}
                step={ranges.marginalTaxRate.step}
                onChange={createChangeHandler("marginalTaxRate")}
                format={formatPercentage}
                label={t("calculator.sections.taxes.marginalTaxRate")}
              />

              <FlameGraph
                value={values.otherDeductions}
                parameter="otherDeductions"
                min={ranges.otherDeductions.min}
                max={ranges.otherDeductions.max}
                step={ranges.otherDeductions.step}
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
                min={ranges.buyingCosts.min}
                max={ranges.buyingCosts.max}
                step={ranges.buyingCosts.step}
                onChange={createChangeHandler("buyingCosts")}
                format={formatPercentage}
                label={t("calculator.sections.closingCosts.buyingCosts")}
              />

              <FlameGraph
                parameter="sellingCosts"
                value={values.sellingCosts}
                min={ranges.sellingCosts.min}
                max={ranges.sellingCosts.max}
                step={ranges.sellingCosts.step}
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
                min={ranges.maintenanceRate.min}
                max={ranges.maintenanceRate.max}
                step={ranges.maintenanceRate.step}
                onChange={createChangeHandler("maintenanceRate")}
                format={formatPercentage}
                label={t("calculator.sections.maintenance.maintenanceRate")}
                parameter="maintenanceRate"
              />

              <FlameGraph
                value={values.homeInsuranceRate}
                min={ranges.homeInsuranceRate.min}
                max={ranges.homeInsuranceRate.max}
                step={ranges.homeInsuranceRate.step}
                onChange={createChangeHandler("homeInsuranceRate")}
                format={formatPercentage}
                label={t("calculator.sections.maintenance.insurance")}
                parameter="homeInsuranceRate"
              />

              <FlameGraph
                value={values.extraPayments}
                min={ranges.extraPayments.min}
                max={ranges.extraPayments.max}
                step={ranges.extraPayments.step}
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
                min={ranges.securityDeposit.min}
                max={ranges.securityDeposit.max}
                step={ranges.securityDeposit.step}
                onChange={createChangeHandler("securityDeposit")}
                format={(v) => `${v} ${v === 1 ? t("month") : t("months")}`}
                label={t("calculator.sections.rentingCosts.securityDeposit")}
              />

              <FlameGraph
                parameter="brokerFee"
                value={values.brokerFee}
                min={ranges.brokerFee.min}
                max={ranges.brokerFee.max}
                step={ranges.brokerFee.step}
                onChange={createChangeHandler("brokerFee")}
                format={formatPercentage}
                label={t("calculator.sections.rentingCosts.brokerFee")}
              />

              <FlameGraph
                parameter="monthlyRentersInsurance"
                value={values.monthlyRentersInsurance}
                min={ranges.monthlyRentersInsurance.min}
                max={ranges.monthlyRentersInsurance.max}
                step={ranges.monthlyRentersInsurance.step}
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
