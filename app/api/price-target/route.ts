import { NextRequest, NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";
import { rateLimitRequest } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  if (!(await rateLimitRequest(req, "price-target", 60, 60))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const data = await finnhubFetch("/stock/price-target", { symbol });
  if (!data) return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
  return NextResponse.json(data);
}
