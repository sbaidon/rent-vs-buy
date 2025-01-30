import i18next from "i18next";

export const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat(i18next.language, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(amount);
};
