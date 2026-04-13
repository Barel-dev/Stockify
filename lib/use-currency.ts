"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type Currency,
  getSavedCurrency,
  getCurrencySymbol,
  getExchangeRates,
  convertPrice,
} from "@/lib/currency";

export function useCurrency() {
  const [currency, setCurrency] = useState<Currency>("USD");
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });

  useEffect(() => {
    setCurrency(getSavedCurrency());
    getExchangeRates().then(setRates);

    const handler = (e: Event) => {
      const c = (e as CustomEvent<Currency>).detail;
      setCurrency(c);
    };
    window.addEventListener("currency-change", handler);
    return () => window.removeEventListener("currency-change", handler);
  }, []);

  const convert = useCallback(
    (usdPrice: number) => convertPrice(usdPrice, rates, currency),
    [rates, currency]
  );

  const symbol = getCurrencySymbol(currency);

  return { currency, symbol, rates, convert };
}
