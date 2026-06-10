import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rateLimit } from "@/lib/cache";

export async function GET() {
  // The Finnhub key must reach the browser to open a Finnhub WebSocket, but
  // only hand it to authenticated users so anonymous visitors / scrapers can't
  // harvest it from an open endpoint.
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Per-user throttle so the key can't be harvested at scale from a script.
  const allowed = await rateLimit(`rl:ws-token:${userId}`, 30, 3600);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Prefer a dedicated (e.g. separate free-tier) key for the browser WebSocket
  // so abuse of a leaked key can't exhaust the server-side REST quota.
  const key = process.env.FINNHUB_WS_API_KEY ?? process.env.FINNHUB_API_KEY ?? "";
  return NextResponse.json({ token: key });
}
