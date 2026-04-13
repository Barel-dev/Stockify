import { NextRequest, NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";

type EarningsCalendarResponse = {
  earningsCalendar?: {
    date: string;
    epsActual: number | null;
    epsEstimate: number | null;
    hour: string;
    quarter: number;
    revenueActual: number | null;
    revenueEstimate: number | null;
    symbol: string;
    year: number;
  }[];
};

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to" }, { status: 400 });
  }

  const data = await finnhubFetch<EarningsCalendarResponse>("/calendar/earnings", { from, to });
  if (!data) return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
  return NextResponse.json(data);
}
