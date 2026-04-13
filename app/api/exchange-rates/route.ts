import { NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";

type QuoteData = { c: number };

// Fetch exchange rates relative to USD using Finnhub forex quotes
export async function GET() {
  const pairs = [
    { pair: "OANDA:EUR_USD", code: "EUR" },
    { pair: "OANDA:GBP_USD", code: "GBP" },
    { pair: "OANDA:USD_ILS", code: "ILS" },
  ];

  const rates: Record<string, number> = { USD: 1 };

  await Promise.all(
    pairs.map(async ({ pair, code }) => {
      const data = await finnhubFetch<QuoteData>("/quote", { symbol: pair });
      if (data && data.c > 0) {
        // EUR_USD means 1 EUR = c USD, so 1 USD = 1/c EUR
        // USD_ILS means 1 USD = c ILS
        if (code === "ILS") {
          rates[code] = data.c;
        } else {
          rates[code] = 1 / data.c;
        }
      }
    })
  );

  return NextResponse.json(rates);
}
