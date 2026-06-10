import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase";

/**
 * Transaction history (buys recorded on add, sells on remove).
 * Fails soft with `available: false` until the transactions table exists,
 * so the UI simply hides the section on fresh setups.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("transactions GET error:", error.message);
    return NextResponse.json({ available: false, transactions: [] });
  }
  return NextResponse.json({ available: true, transactions: data ?? [] });
}
