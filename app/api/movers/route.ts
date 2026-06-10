import { NextRequest, NextResponse } from "next/server";
import { cachedFetch, rateLimitRequest } from "@/lib/cache";
import { fetchYahooSnapshot, type YahooSnapshot } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Liquid large-cap universe scanned by the movers page. Server-side so one
// cached scan serves every visitor instead of 70 client fetches each.
const UNIVERSE = [
  "AAPL", "MSFT", "NVDA", "GOOG", "AMZN", "META", "TSLA", "AVGO", "TSM", "AMD",
  "NFLX", "CRM", "ORCL", "ADBE", "INTC", "QCOM", "MU", "PLTR", "SMCI", "ARM",
  "JPM", "V", "MA", "BAC", "GS", "MS", "WFC", "AXP", "C", "COIN",
  "UNH", "LLY", "JNJ", "PFE", "MRK", "ABBV", "TMO", "AMGN", "ISRG",
  "XOM", "CVX", "COP", "SLB", "OXY",
  "WMT", "COST", "HD", "NKE", "MCD", "SBUX", "DIS", "ABNB", "UBER", "BKNG",
  "CAT", "BA", "HON", "GE", "DE", "LMT", "RTX",
  "T", "VZ", "CMCSA", "PEP", "KO", "PG", "MDLZ",
  "SPY", "QQQ", "IWM", "DIA",
];

export async function GET(req: NextRequest) {
  if (!(await rateLimitRequest(req, "movers", 30, 60))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // One scan per minute serves everyone (cache no-ops without Redis).
  const data = await cachedFetch<{ stocks: YahooSnapshot[]; ts: number }>(
    "movers:v1",
    async () => {
      const results = await Promise.all(UNIVERSE.map((sym) => fetchYahooSnapshot(sym)));
      return {
        stocks: results.filter((r): r is YahooSnapshot => r !== null),
        ts: Date.now(),
      };
    },
    60
  );

  if (!data || data.stocks.length === 0) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
  }
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
