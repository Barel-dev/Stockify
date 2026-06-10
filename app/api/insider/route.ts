import { NextRequest, NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";
import { cachedFetch, rateLimitRequest } from "@/lib/cache";

type InsiderTransaction = {
  name?: string;
  share?: number;
  change?: number;
  filingDate?: string;
  transactionDate?: string;
  transactionCode?: string;
  transactionPrice?: number;
};

type InsiderResponse = { data?: InsiderTransaction[]; symbol?: string };

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  if (!(await rateLimitRequest(req, "insider", 60, 60))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Last 6 months of filings; insider data changes slowly, cache for an hour.
  const from = new Date(Date.now() - 182 * 86400_000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);

  const data = await cachedFetch<InsiderResponse | null>(
    `insider:${symbol}`,
    () => finnhubFetch<InsiderResponse>("/stock/insider-transactions", { symbol, from, to }),
    3600
  );

  if (!data) return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
  return NextResponse.json(data);
}
