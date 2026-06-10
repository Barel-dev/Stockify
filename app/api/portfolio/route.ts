import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase";
import { finnhubFetch } from "@/lib/finnhub";
import { fetchYahooQuote } from "@/lib/yahoo";

/**
 * Best-effort transaction logging — the portfolio works fine without the
 * transactions table, so failures here are logged and swallowed.
 */
async function recordTransaction(row: {
  user_id: string;
  symbol: string;
  side: "buy" | "sell";
  shares: number;
  price: number;
  realized_pnl?: number | null;
}) {
  try {
    const { error } = await getSupabase().from("transactions").insert(row);
    if (error) console.error("transactions insert error:", error.message);
  } catch (err) {
    console.error("transactions insert error:", err);
  }
}

// Log the real error server-side; never leak table/constraint details to clients.
function dbError(scope: string, error: { message: string }) {
  console.error(`portfolio ${scope} error:`, error.message);
  return NextResponse.json({ error: "Database error" }, { status: 500 });
}

const SYMBOL_RE = /^[A-Za-z0-9.:_=^-]{1,25}$/;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("portfolio")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return dbError("GET", error);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const { symbol, shares, buyPrice, companyName } = body as {
    symbol?: unknown;
    shares?: unknown;
    buyPrice?: unknown;
    companyName?: unknown;
  };

  if (typeof symbol !== "string" || !SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  const nShares = Number(shares);
  const nBuyPrice = Number(buyPrice);
  if (!Number.isFinite(nShares) || nShares <= 0 || nShares > 1e9) {
    return NextResponse.json({ error: "shares must be a positive number" }, { status: 400 });
  }
  if (!Number.isFinite(nBuyPrice) || nBuyPrice <= 0 || nBuyPrice > 1e9) {
    return NextResponse.json({ error: "buyPrice must be a positive number" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("portfolio")
    .insert({
      user_id: userId,
      symbol: symbol.toUpperCase(),
      shares: nShares,
      buy_price: nBuyPrice,
      company_name: typeof companyName === "string" ? companyName.slice(0, 100) : "",
    })
    .select()
    .single();

  if (error) return dbError("POST", error);

  await recordTransaction({
    user_id: userId,
    symbol: symbol.toUpperCase(),
    side: "buy",
    shares: nShares,
    price: nBuyPrice,
  });

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = body?.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getSupabase();

  // Read the holding first so the sell can be recorded with realized P/L.
  const { data: holding } = await supabase
    .from("portfolio")
    .select("symbol, shares, buy_price")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  const { error } = await supabase
    .from("portfolio")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return dbError("DELETE", error);

  if (holding) {
    let quote = await finnhubFetch<{ c?: number }>("/quote", { symbol: holding.symbol }).catch(() => null);
    if (!quote?.c) quote = await fetchYahooQuote(holding.symbol);
    const price = quote?.c && quote.c > 0 ? quote.c : holding.buy_price;
    await recordTransaction({
      user_id: userId,
      symbol: holding.symbol,
      side: "sell",
      shares: holding.shares,
      price,
      realized_pnl: (price - holding.buy_price) * holding.shares,
    });
  }

  return NextResponse.json({ success: true });
}
