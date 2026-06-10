import { NextRequest, NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";
import { rateLimitRequest } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 });

  if (!(await rateLimitRequest(req, "search", 60, 60))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const data = await finnhubFetch("/search", { q });
  if (!data) return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
  return NextResponse.json(data);
}
