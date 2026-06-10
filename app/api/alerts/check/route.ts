import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getSupabase } from "@/lib/supabase";
import { finnhubFetch } from "@/lib/finnhub";
import { fetchYahooQuote } from "@/lib/yahoo";
import { getWebPush, type PushPayload } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type AlertRow = {
  id: string;
  user_id: string;
  symbol: string;
  target_price: number;
  direction: "above" | "below";
};

type SubscriptionRow = {
  user_id: string;
  endpoint: string;
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
};

function secretMatches(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret");
  if (!secret || !provided) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Cron-driven alert sweep: checks every untriggered alert against live
 * prices and Web-Pushes the owners of any that fire. Invoked by the
 * GitHub Actions schedule in .github/workflows/alert-cron.yml.
 */
export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (!secretMatches(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data: alerts, error } = await supabase
    .from("alerts")
    .select("id, user_id, symbol, target_price, direction")
    .eq("triggered", false)
    .limit(500);

  if (error) {
    console.error("alerts/check db error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!alerts || alerts.length === 0) {
    return NextResponse.json({ checked: 0, triggered: 0, pushed: 0 });
  }

  // One quote per unique symbol.
  const symbols = [...new Set((alerts as AlertRow[]).map((a) => a.symbol))];
  const prices = new Map<string, number>();
  await Promise.all(
    symbols.map(async (sym) => {
      let quote = await finnhubFetch<{ c?: number }>("/quote", { symbol: sym }).catch(() => null);
      if (!quote?.c) quote = await fetchYahooQuote(sym);
      if (quote?.c && quote.c > 0) prices.set(sym, quote.c);
    })
  );

  const fired = (alerts as AlertRow[]).filter((a) => {
    const price = prices.get(a.symbol);
    if (!price) return false;
    return a.direction === "above" ? price >= a.target_price : price <= a.target_price;
  });

  if (fired.length === 0) {
    return NextResponse.json({ checked: alerts.length, triggered: 0, pushed: 0 });
  }

  // Mark as triggered first so a crash can't re-notify the same alerts forever.
  const { error: updateError } = await supabase
    .from("alerts")
    .update({ triggered: true })
    .in("id", fired.map((a) => a.id));
  if (updateError) {
    console.error("alerts/check update error:", updateError.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // Push notifications — best-effort, requires VAPID keys + subscriptions table.
  let pushed = 0;
  const webpush = getWebPush();
  if (webpush) {
    const userIds = [...new Set(fired.map((a) => a.user_id))];
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, subscription")
      .in("user_id", userIds);

    const byUser = new Map<string, SubscriptionRow[]>();
    for (const s of (subs ?? []) as SubscriptionRow[]) {
      const arr = byUser.get(s.user_id) ?? [];
      arr.push(s);
      byUser.set(s.user_id, arr);
    }

    await Promise.all(
      fired.map(async (a) => {
        const price = prices.get(a.symbol)!;
        const payload: PushPayload = {
          title: `Stockify Alert: ${a.symbol}`,
          body: `${a.symbol} is now $${price.toFixed(2)} — ${a.direction} your target of $${a.target_price.toFixed(2)}`,
          url: `/?ticker=${encodeURIComponent(a.symbol)}`,
        };
        for (const sub of byUser.get(a.user_id) ?? []) {
          try {
            await webpush.sendNotification(sub.subscription, JSON.stringify(payload));
            pushed++;
          } catch (err) {
            const status = (err as { statusCode?: number }).statusCode;
            // Subscription expired or revoked — clean it up.
            if (status === 404 || status === 410) {
              await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            }
          }
        }
      })
    );
  }

  return NextResponse.json({ checked: alerts.length, triggered: fired.length, pushed });
}
