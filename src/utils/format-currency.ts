import i18next from "i18next";

export const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat(i18next.language, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(amount);
};

/**
 * Compact currency formatter for chart axes — e.g. "$400K", "$1.2M"
 */
export const formatCurrencyCompact = (
  amount: number,
  currency: string,
): string => {
  return new Intl.NumberFormat(i18next.language, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
};
