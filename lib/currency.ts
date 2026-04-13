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

// Exchange rates cache (USD-based)
let ratesCache: Record<string, number> | null = null;
let ratesFetchPromise: Promise<Record<string, number>> | null = null;

export async function getExchangeRates(): Promise<Record<string, number>> {
  if (ratesCache) return ratesCache;
  if (ratesFetchPromise) return ratesFetchPromise;
  ratesFetchPromise = fetch("/api/exchange-rates")
    .then((r) => r.json())
    .then((data: Record<string, number>) => {
      ratesCache = data;
      // Refresh cache every 5 minutes
      setTimeout(() => { ratesCache = null; ratesFetchPromise = null; }, 5 * 60 * 1000);
      return data;
    })
    .catch(() => {
      ratesFetchPromise = null;
      return { USD: 1 } as Record<string, number>;
    });
  return ratesFetchPromise;
}

export function convertPrice(usdPrice: number, rates: Record<string, number>, currency: Currency): number {
  if (currency === "USD") return usdPrice;
  const rate = rates[currency];
  if (!rate) return usdPrice;
  return usdPrice * rate;
}
