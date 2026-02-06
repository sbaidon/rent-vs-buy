import React, { useCallback, useMemo, useState } from "react";
import { CalculatorValues, useCalculator } from "../context/calculator-context";
import FlameGraph from "./flame-graph";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "../utils/format-currency";
import { useAppContext } from "../context/app-context";
import { INPUT_CONFIG_PER_COUNTRY } from "../config/calculator-config";
import { getCountryConfig } from "../constants/country-rules";
import Tooltip from "./tooltip";

const Calculator: React.FC = () => {
  const { values, updateValue } = useCalculator();
  const { t } = useTranslation();
  const { currency, country } = useAppContext();
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

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
  const countryConfig = useMemo(() => getCountryConfig(country), [country]);

  // Determine which inputs to show/hide based on country
  const showTCJA = country === "US";
  const showFilingType = country === "US" || country === "DE";
  const showMarginalTaxRate = country === "US" || country === "MX";
  const showOtherDeductions = country === "US";
  const showPMI = countryConfig.mortgageRules.hasMortgageInsurance;

  // Country-specific property tax label
  const propertyTaxLabel = countryConfig.labels?.propertyTax
    ? `${countryConfig.labels.propertyTax} rate`
    : t("calculator.sections.taxes.propertyTaxRate");

  const renderLabel = useCallback(
    (labelKey: string, tooltipKey: string) => (
      <div className="flex items-center">
        <span className="text-[var(--text-secondary)]">{t(labelKey)}</span>
        <Tooltip content={t(tooltipKey)} />
      </div>
    ),
    [t]
  );

  return (
    <>
      {/* Mode Toggle */}
      <div className="flex items-center justify-end gap-3 mb-2">
        <span id="mode-basic-label"
          className={`text-sm font-medium transition-colors ${!isAdvancedMode ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}
        >
          {t("calculator.basic")}
        </span>
        <button
          role="switch"
          aria-checked={isAdvancedMode}
          aria-label={`${t("calculator.basic")} / ${t("calculator.advanced")}`}
          onClick={() => setIsAdvancedMode(!isAdvancedMode)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            isAdvancedMode ? 'bg-copper-500' : 'bg-[var(--bg-muted)]'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              isAdvancedMode ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <span id="mode-advanced-label"
          className={`text-sm font-medium transition-colors ${isAdvancedMode ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}
        >
          {t("calculator.advanced")}
        </span>
      </div>

      {/* Basic Fields - Always visible */}
      <section className="pt-8">
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
              label={renderLabel(
                "calculator.sections.basics.homePrice",
                "calculator.tooltips.homePrice"
              )}
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
              label={renderLabel(
                "calculator.sections.basics.monthlyRent",
                "calculator.tooltips.monthlyRent"
              )}
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
              label={renderLabel(
                "calculator.sections.mortgage.rate",
                "calculator.tooltips.mortgageRate"
              )}
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
              label={renderLabel(
                "calculator.sections.mortgage.downPayment",
                "calculator.tooltips.downPayment"
              )}
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
              label={renderLabel(
                "calculator.sections.mortgage.yearsToStay",
                "calculator.tooltips.yearsToStay"
              )}
            />
          </div>
        </div>
      </section>



      {/* Advanced Fields - Only visible in advanced mode */}
      {isAdvancedMode && (
        <>
          <section className="pt-8">
            <h2 className="mb-4 text-sm uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              {t("calculator.sections.mortgage.title")} ({t("calculator.advanced")})
            </h2>
            <div className="space-y-8">
              <div>
                <FlameGraph
                  value={values.mortgageTerm}
                  parameter="mortgageTerm"
                  min={ranges.mortgageTerm.min}
                  max={ranges.mortgageTerm.max}
                  step={ranges.mortgageTerm.step}
                  onChange={createChangeHandler("mortgageTerm")}
                  format={(v) => `${v} ${t("years")}`}
                  label={renderLabel(
                    "calculator.sections.mortgage.mortgageLength",
                    "calculator.tooltips.mortgageLength"
                  )}
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
                  label={renderLabel(
                    "calculator.sections.mortgage.pmi",
                    "calculator.tooltips.pmi"
                  )}
                />
              </div>
            </div>
          </section>

          <section className="pt-8">
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
                label={renderLabel(
                  "calculator.sections.future.homePriceGrowth",
                  "calculator.tooltips.homePriceGrowth"
                )}
              />

              <FlameGraph
                value={values.rentGrowth}
                parameter="rentGrowth"
                min={ranges.rentGrowth.min}
                max={ranges.rentGrowth.max}
                step={ranges.rentGrowth.step}
                onChange={createChangeHandler("rentGrowth")}
                format={formatPercentage}
                label={renderLabel(
                  "calculator.sections.future.rentGrowth",
                  "calculator.tooltips.rentGrowth"
                )}
              />

              <FlameGraph
                value={values.investmentReturn}
                parameter="investmentReturn"
                min={ranges.investmentReturn.min}
                max={ranges.investmentReturn.max}
                step={ranges.investmentReturn.step}
                onChange={createChangeHandler("investmentReturn")}
                format={formatPercentage}
                label={renderLabel(
                  "calculator.sections.future.investmentReturn",
                  "calculator.tooltips.investmentReturn"
                )}
              />

              <FlameGraph
                value={values.inflationRate}
                parameter="inflationRate"
                min={ranges.inflationRate.min}
                max={ranges.inflationRate.max}
                step={ranges.inflationRate.step}
                onChange={createChangeHandler("inflationRate")}
                format={formatPercentage}
                label={renderLabel(
                  "calculator.sections.future.inflationRate",
                  "calculator.tooltips.inflationRate"
                )}
              />
            </div>
          </div>

          {/* Tax section */}
          <div>
            <h2 className="900 mb-2">{t("calculator.sections.taxes.title")}</h2>
            <div className="space-y-8">
              {showFilingType && (
                <fieldset className="mb-4">
                  <legend className="text-[var(--text-muted)] mb-2">{t("calculator.sections.taxes.filingType")}</legend>
                  <div className="flex items-center space-x-4">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="filingType"
                        className="form-radio accent-copper-500"
                        checked={!values.isJointReturn}
                        onChange={() => updateValue("isJointReturn", false)}
                      />
                       <span className="text-[var(--text-secondary)] ml-2">
                        {t("calculator.sections.taxes.individual")}
                      </span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="filingType"
                        className="form-radio accent-copper-500"
                        checked={values.isJointReturn}
                        onChange={() => updateValue("isJointReturn", true)}
                      />
                       <span className="text-[var(--text-secondary)] ml-2">
                        {t("calculator.sections.taxes.joint")}
                      </span>
                    </label>
                  </div>
                </fieldset>
              )}

              <FlameGraph
                value={values.propertyTaxRate}
                parameter="propertyTaxRate"
                min={ranges.propertyTaxRate.min}
                max={ranges.propertyTaxRate.max}
                step={ranges.propertyTaxRate.step}
                onChange={createChangeHandler("propertyTaxRate")}
                format={formatPercentage}
                label={
                  <div className="flex items-center">
                    <span className="text-[var(--text-secondary)]">{propertyTaxLabel}</span>
                    <Tooltip content={t("calculator.tooltips.propertyTaxRate")} />
                  </div>
                }
              />

              {showMarginalTaxRate && (
                <FlameGraph
                  value={values.marginalTaxRate}
                  parameter="marginalTaxRate"
                  min={ranges.marginalTaxRate.min}
                  max={ranges.marginalTaxRate.max}
                  step={ranges.marginalTaxRate.step}
                  onChange={createChangeHandler("marginalTaxRate")}
                  format={formatPercentage}
                  label={renderLabel(
                    "calculator.sections.taxes.marginalTaxRate",
                    "calculator.tooltips.marginalTaxRate"
                  )}
                />
              )}

              {showOtherDeductions && (
                <FlameGraph
                  value={values.otherDeductions}
                  parameter="otherDeductions"
                  min={ranges.otherDeductions.min}
                  max={ranges.otherDeductions.max}
                  step={ranges.otherDeductions.step}
                  onChange={createChangeHandler("otherDeductions")}
                  format={formatCurrencyValue}
                  label={renderLabel(
                    "calculator.sections.taxes.otherDeductions",
                    "calculator.tooltips.otherDeductions"
                  )}
                />
              )}

              {showTCJA && (
                <fieldset>
                  <legend className="text-[var(--text-muted)] mb-2">{t("calculator.sections.taxes.taxCutsQuestion")}</legend>
                  <div className="flex items-center space-x-4">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="taxCuts"
                        className="form-radio accent-copper-500"
                        checked={values.taxCutsExpire}
                        onChange={() => updateValue("taxCutsExpire", true)}
                      />
                       <span className="text-[var(--text-secondary)] ml-2">
                        {t("calculator.sections.taxes.expire")}
                      </span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="taxCuts"
                        className="form-radio accent-copper-500"
                        checked={!values.taxCutsExpire}
                        onChange={() => updateValue("taxCutsExpire", false)}
                      />
                       <span className="text-[var(--text-secondary)] ml-2">
                        {t("calculator.sections.taxes.renew")}
                      </span>
                    </label>
                  </div>
                </fieldset>
              )}

              {/* Country-specific toggles */}
              {country === "GB" && (
                <div className="flex items-center justify-between p-3 rounded bg-[var(--bg-muted)]/30">
                  <span id="firstTimeBuyer-label" className="text-[var(--text-secondary)] text-sm">
                    {t("calculator.sections.taxes.firstTimeBuyer")}
                  </span>
                  <button
                    role="switch"
                    aria-checked={values.isFirstTimeBuyer}
                    aria-labelledby="firstTimeBuyer-label"
                    onClick={() => updateValue("isFirstTimeBuyer", !values.isFirstTimeBuyer)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      values.isFirstTimeBuyer ? 'bg-copper-500' : 'bg-[var(--bg-muted)]'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      values.isFirstTimeBuyer ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              )}

              {country === "FR" && (
                <div className="flex items-center justify-between p-3 rounded bg-[var(--bg-muted)]/30">
                  <span id="newBuild-label" className="text-[var(--text-secondary)] text-sm">
                    {t("calculator.sections.taxes.newBuild")}
                  </span>
                  <button
                    role="switch"
                    aria-checked={values.isNewBuild}
                    aria-labelledby="newBuild-label"
                    onClick={() => updateValue("isNewBuild", !values.isNewBuild)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      values.isNewBuild ? 'bg-copper-500' : 'bg-[var(--bg-muted)]'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      values.isNewBuild ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              )}

              {country === "IT" && (
                <div className="flex items-center justify-between p-3 rounded bg-[var(--bg-muted)]/30">
                  <span id="primaryResidence-label" className="text-[var(--text-secondary)] text-sm">
                    {t("calculator.sections.taxes.primaryResidence")}
                  </span>
                  <button
                    role="switch"
                    aria-checked={values.isPrimaryResidence}
                    aria-labelledby="primaryResidence-label"
                    onClick={() => updateValue("isPrimaryResidence", !values.isPrimaryResidence)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      values.isPrimaryResidence ? 'bg-copper-500' : 'bg-[var(--bg-muted)]'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      values.isPrimaryResidence ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              )}

              {country === "ES" && (
                <div className="flex items-center justify-between p-3 rounded bg-[var(--bg-muted)]/30">
                  <span id="willReinvest-label" className="text-[var(--text-secondary)] text-sm">
                    {t("calculator.sections.taxes.willReinvest")}
                  </span>
                  <button
                    role="switch"
                    aria-checked={values.willReinvest}
                    aria-labelledby="willReinvest-label"
                    onClick={() => updateValue("willReinvest", !values.willReinvest)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      values.willReinvest ? 'bg-copper-500' : 'bg-[var(--bg-muted)]'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      values.willReinvest ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              )}
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
                label={renderLabel(
                  "calculator.sections.closingCosts.buyingCosts",
                  "calculator.tooltips.buyingCosts"
                )}
              />

              <FlameGraph
                parameter="sellingCosts"
                value={values.sellingCosts}
                min={ranges.sellingCosts.min}
                max={ranges.sellingCosts.max}
                step={ranges.sellingCosts.step}
                onChange={createChangeHandler("sellingCosts")}
                format={formatPercentage}
                label={renderLabel(
                  "calculator.sections.closingCosts.sellingCosts",
                  "calculator.tooltips.sellingCosts"
                )}
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
                label={renderLabel(
                  "calculator.sections.maintenance.maintenanceRate",
                  "calculator.tooltips.maintenanceRate"
                )}
                parameter="maintenanceRate"
              />

              <FlameGraph
                value={values.homeInsuranceRate}
                min={ranges.homeInsuranceRate.min}
                max={ranges.homeInsuranceRate.max}
                step={ranges.homeInsuranceRate.step}
                onChange={createChangeHandler("homeInsuranceRate")}
                format={formatPercentage}
                label={renderLabel(
                  "calculator.sections.maintenance.insurance",
                  "calculator.tooltips.insurance"
                )}
                parameter="homeInsuranceRate"
              />

              <FlameGraph
                value={values.extraPayments}
                min={ranges.extraPayments.min}
                max={ranges.extraPayments.max}
                step={ranges.extraPayments.step}
                onChange={createChangeHandler("extraPayments")}
                format={formatCurrencyValue}
                label={renderLabel(
                  "calculator.sections.maintenance.extraPayments",
                  "calculator.tooltips.extraPayments"
                )}
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
                label={renderLabel(
                  "calculator.sections.rentingCosts.securityDeposit",
                  "calculator.tooltips.securityDeposit"
                )}
              />

              <FlameGraph
                parameter="brokerFee"
                value={values.brokerFee}
                min={ranges.brokerFee.min}
                max={ranges.brokerFee.max}
                step={ranges.brokerFee.step}
                onChange={createChangeHandler("brokerFee")}
                format={formatPercentage}
                label={renderLabel(
                  "calculator.sections.rentingCosts.brokerFee",
                  "calculator.tooltips.brokerFee"
                )}
              />

              <FlameGraph
                parameter="monthlyRentersInsurance"
                value={values.monthlyRentersInsurance}
                min={ranges.monthlyRentersInsurance.min}
                max={ranges.monthlyRentersInsurance.max}
                step={ranges.monthlyRentersInsurance.step}
                onChange={createChangeHandler("monthlyRentersInsurance")}
                format={formatCurrencyValue}
                label={renderLabel(
                  "calculator.sections.rentingCosts.monthlyRentersInsurance",
                  "calculator.tooltips.monthlyRentersInsurance"
                )}
              />
            </div>
          </div>
        </div>
        </section>
        </>
      )}
    </>
  );
};

export default Calculator;
