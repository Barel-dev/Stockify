import { NextRequest, NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";
import { cachedFetch, rateLimitRequest } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  if (!(await rateLimitRequest(req, "metrics", 60, 60))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const data = await cachedFetch(
    `metrics:${symbol}`,
    () => finnhubFetch("/stock/metric", { symbol, metric: "all" }),
    300 // 5min TTL for metrics
  );
  if (!data) return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
  return NextResponse.json(data);
}
