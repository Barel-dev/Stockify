import { NextRequest, NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";
import { cachedFetch, rateLimitRequest } from "@/lib/cache";
import { fetchYahooQuote } from "@/lib/yahoo";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  if (!(await rateLimitRequest(req, "quote", 120, 60))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const data = await cachedFetch(
    `quote:${symbol}`,
    async () => {
      const finnhub = await finnhubFetch("/quote", { symbol }) as { c?: number; d?: number; dp?: number } | null;
      // If Finnhub returns valid data, use it
      if (finnhub && finnhub.c && finnhub.c > 0) return finnhub;
      // Fall back to Yahoo Finance
      return fetchYahooQuote(symbol);
    },
    15 // 15s TTL for quotes
  );
  if (!data) return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
  return NextResponse.json(data);
}
