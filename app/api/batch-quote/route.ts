import { NextRequest, NextResponse } from "next/server";
import { rateLimitRequest } from "@/lib/cache";
import { fetchYahooQuote, type YahooQuote } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols");
  if (!symbolsParam) {
    return NextResponse.json({ error: "Missing symbols parameter" }, { status: 400 });
  }

  // Each request can fan out to up to 50 upstream fetches, so keep the
  // per-IP budget tighter than the single-quote endpoint.
  if (!(await rateLimitRequest(req, "batch-quote", 20, 60))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const symbols = symbolsParam.split(",").slice(0, 50); // cap at 50
  const results: Record<string, YahooQuote | null> = {};

  await Promise.all(
    symbols.map(async (sym) => {
      results[sym] = await fetchYahooQuote(sym);
    })
  );

  return NextResponse.json(results);
}
