export type Currency = "USD" | "EUR" | "GBP" | "ILS";

export const CURRENCIES: { code: Currency; symbol: string; name: string }[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "\u20AC", name: "Euro" },
  { code: "GBP", symbol: "\u00A3", name: "British Pound" },
  { code: "ILS", symbol: "\u20AA", name: "Israeli Shekel" },
];

const STORAGE_KEY = "stockify-currency";

export function getSavedCurrency(): Currency {
  if (typeof window === "undefined") return "USD";
  return (localStorage.getItem(STORAGE_KEY) as Currency) || "USD";
}

export function saveCurrency(currency: Currency) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, currency);
}

export function getCurrencySymbol(currency: Currency): string {
  return CURRENCIES.find((c) => c.code === currency)?.symbol ?? "$";
}
