import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase";

// Log the real error server-side; never leak table/constraint details to clients.
function dbError(scope: string, error: { message: string }) {
  console.error(`watchlist ${scope} error:`, error.message);
  return NextResponse.json({ error: "Database error" }, { status: 500 });
}

const SYMBOL_RE = /^[A-Za-z0-9.:_=^-]{1,25}$/;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });

  if (error) return dbError("GET", error);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const { symbol, companyName } = body as { symbol?: unknown; companyName?: unknown };
  if (typeof symbol !== "string" || !SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("watchlist")
    .upsert(
      {
        user_id: userId,
        symbol,
        company_name: typeof companyName === "string" ? companyName.slice(0, 100) : "",
      },
      { onConflict: "user_id,symbol" }
    )
    .select()
    .single();

  if (error) return dbError("POST", error);
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const symbol = body?.symbol;
  if (typeof symbol !== "string" || !symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", userId)
    .eq("symbol", symbol);

  if (error) return dbError("DELETE", error);
  return NextResponse.json({ success: true });
}
