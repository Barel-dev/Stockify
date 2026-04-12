import { NextRequest, NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  const data = await finnhubFetch("/stock/recommendation", { symbol });
  if (!data) return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
  return NextResponse.json(data);
}
