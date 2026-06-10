// Shared Yahoo Finance chart-API helpers used by the quote, batch-quote,
// candles, and market-stream routes.

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

export type YahooMeta = {
  symbol?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
};

export type YahooChartResult = {
  meta: YahooMeta;
  timestamp?: number[];
  indicators?: {
    quote: {
      open: (number | null)[];
      high: (number | null)[];
      low: (number | null)[];
      close: (number | null)[];
      volume?: (number | null)[];
    }[];
  };
};

type YahooChartResponse = {
  chart: {
    result?: YahooChartResult[];
    error?: { description?: string };
  };
};

export type YahooQuote = { c: number; d: number; dp: number };

/**
 * Convert a Finnhub-style symbol to a Yahoo Finance ticker.
 *   BINANCE:BTCUSDT  → BTC-USD
 *   OANDA:EUR_USD    → EURUSD=X
 *   AAPL             → AAPL
 */
export function toYahooSymbol(symbol: string): string {
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

/** Fetch a raw Yahoo chart result; null on any failure. */
export async function fetchYahooChart(
  yahooSymbol: string,
  range: string,
  interval: string
): Promise<YahooChartResult | null> {
  try {
    const url = `${YAHOO_BASE}/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=${interval}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as YahooChartResponse;
    return data.chart?.result?.[0] ?? null;
  } catch {
    return null;
  }
}

/** Current price + day change for a symbol (Finnhub-style prefixes accepted). */
export async function fetchYahooQuote(symbol: string): Promise<YahooQuote | null> {
  const result = await fetchYahooChart(toYahooSymbol(symbol), "1d", "1d");
  const meta = result?.meta;
  if (!meta || !meta.regularMarketPrice) return null;
  const price = meta.regularMarketPrice;
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change = price - prevClose;
  const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
  return { c: price, d: change, dp: changePct };
}
