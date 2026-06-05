import { NextRequest, NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";
import { cachedFetch } from "@/lib/cache";

type YahooChart = {
  chart: {
    result?: {
      meta: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
      };
    }[];
  };
};

/**
 * Convert a Finnhub-style symbol to a Yahoo Finance ticker so crypto/forex
 * fall back correctly (e.g. BINANCE:BTCUSDT → BTC-USD, OANDA:EUR_USD → EURUSD=X).
 */
function toYahooSymbol(symbol: string): string {
  if (symbol.startsWith("BINANCE:")) {
    const pair = symbol.replace("BINANCE:", "");
    const base = pair.replace(/USDT$/, "").replace(/USD$/, "");
    return `${base}-USD`;
  }
  if (symbol.startsWith("OANDA:")) {
    const pair = symbol.replace("OANDA:", "").replace("_", "");
    return `${pair}=X`;
  }
  return symbol;
}

async function yahooFallback(symbol: string) {
  try {
    const yahooSymbol = toYahooSymbol(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as YahooChart;
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta || !meta.regularMarketPrice) return null;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
    return { c: price, d: change, dp: changePct };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  const data = await cachedFetch(
    `quote:${symbol}`,
    async () => {
      const finnhub = await finnhubFetch("/quote", { symbol }) as { c?: number; d?: number; dp?: number } | null;
      // If Finnhub returns valid data, use it
      if (finnhub && finnhub.c && finnhub.c > 0) return finnhub;
      // Fall back to Yahoo Finance
      return yahooFallback(symbol);
    },
    15 // 15s TTL for quotes
  );
  if (!data) return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
  return NextResponse.json(data);
}
