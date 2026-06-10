import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase";

// Log the real error server-side; never leak table/constraint details to clients.
function dbError(scope: string, error: { message: string }) {
  console.error(`alerts ${scope} error:`, error.message);
  return NextResponse.json({ error: "Database error" }, { status: 500 });
}

const SYMBOL_RE = /^[A-Za-z0-9.:_=^-]{1,25}$/;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("alerts")
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

  const { symbol, targetPrice, direction } = body as {
    symbol?: unknown;
    targetPrice?: unknown;
    direction?: unknown;
  };

  if (typeof symbol !== "string" || !SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }
  const nTarget = Number(targetPrice);
  if (!Number.isFinite(nTarget) || nTarget <= 0 || nTarget > 1e9) {
    return NextResponse.json({ error: "targetPrice must be a positive number" }, { status: 400 });
  }
  if (direction !== "above" && direction !== "below") {
    return NextResponse.json({ error: "direction must be 'above' or 'below'" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("alerts")
    .insert({
      user_id: userId,
      symbol,
      target_price: nTarget,
      direction,
      triggered: false,
    })
    .select()
    .single();

  if (error) return dbError("POST", error);
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = body?.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("alerts")
    .update({ triggered: true })
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();

  if (error) return dbError("PATCH", error);
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = body?.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getSupabase();
  const { error } = await supabase
    .from("alerts")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  if (error) return dbError("DELETE", error);
  return NextResponse.json({ success: true });
}
