import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.FINNHUB_API_KEY ?? "";
  const hasKey = key.length > 0;
  const keyPreview = hasKey ? key.slice(0, 4) + "..." : "(empty)";

  // Try a direct fetch to Finnhub
  let fetchResult = "not attempted";
  if (hasKey) {
    try {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${key}`);
      fetchResult = `status=${res.status}, body=${await res.text()}`;
    } catch (err: unknown) {
      fetchResult = `error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return NextResponse.json({
    hasKey,
    keyPreview,
    fetchResult,
    nodeEnv: process.env.NODE_ENV,
  });
}
