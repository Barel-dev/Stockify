import { NextRequest, NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";
import { rateLimitRequest } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const symbol = searchParams.get("symbol");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  if (!from) return NextResponse.json({ error: "Missing from" }, { status: 400 });
  if (!to) return NextResponse.json({ error: "Missing to" }, { status: 400 });

  if (!(await rateLimitRequest(req, "news", 60, 60))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const data = await finnhubFetch("/company-news", { symbol, from, to });
  if (!data) return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
  return NextResponse.json(data);
}
