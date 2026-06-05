import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  // The Finnhub key must reach the browser to open a Finnhub WebSocket, but
  // only hand it to authenticated users so anonymous visitors / scrapers can't
  // harvest it from an open endpoint.
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.FINNHUB_API_KEY ?? "";
  return NextResponse.json({ token: key });
}
