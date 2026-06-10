import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase";
import { finnhubFetch } from "@/lib/finnhub";
import { fetchYahooQuote } from "@/lib/yahoo";
import { rateLimit } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Holding = { symbol: string; shares: number; buy_price: number; company_name: string };
type Quote = { c?: number; dp?: number };

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "AI analysis is not configured." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // Authenticated + paid endpoint → throttle per user, not per IP.
  const allowed = await rateLimit(`rl:analyze-portfolio:${userId}`, 10, 3600);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit reached. Please try again later." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = getSupabase();
  const { data: holdings, error } = await supabase
    .from("portfolio")
    .select("symbol, shares, buy_price, company_name")
    .eq("user_id", userId)
    .limit(20);

  if (error) {
    console.error("analyze-portfolio db error:", error.message);
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
  }
  if (!holdings || holdings.length === 0) {
    return new Response(JSON.stringify({ error: "No holdings to review" }), { status: 404 });
  }

  const rows = await Promise.all(
    (holdings as Holding[]).map(async (h) => {
      let quote = await finnhubFetch<Quote>("/quote", { symbol: h.symbol }).catch(() => null);
      if (!quote?.c) quote = await fetchYahooQuote(h.symbol);
      const price = quote?.c ?? 0;
      const value = price * h.shares;
      const plPct = price > 0 && h.buy_price > 0 ? ((price - h.buy_price) / h.buy_price) * 100 : null;
      return { ...h, price, value, plPct };
    })
  );

  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const totalCost = rows.reduce((s, r) => s + r.buy_price * r.shares, 0);

  const lines = rows.map((r) => {
    const weight = totalValue > 0 ? (r.value / totalValue) * 100 : 0;
    return `- ${r.symbol} (${r.company_name || "n/a"}): ${r.shares} shares @ cost $${r.buy_price.toFixed(2)}, now ${r.price > 0 ? `$${r.price.toFixed(2)}` : "n/a"}, P/L ${r.plPct != null ? `${r.plPct >= 0 ? "+" : ""}${r.plPct.toFixed(1)}%` : "n/a"}, weight ${weight.toFixed(1)}%`;
  });

  const context = `
Portfolio (${rows.length} positions):
${lines.join("\n")}

Total cost basis: $${totalCost.toFixed(0)}
Total current value: $${totalValue.toFixed(0)}
Overall P/L: ${totalCost > 0 ? `${(((totalValue - totalCost) / totalCost) * 100).toFixed(1)}%` : "n/a"}
`.trim();

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1200,
          system: `You are a portfolio risk analyst reviewing a retail investor's holdings.
Produce a terse, structured review in Markdown with these sections:

## Health Check
2-3 bullets: overall P/L, what's driving it, anything notable about position sizing.

## Concentration & Diversification
2-3 bullets: weight concentration, sector/asset overlap, single-name risk. Be specific with the numbers given.

## Winners & Losers
2 bullets: the strongest and weakest positions and what that suggests.

## One Thing To Watch
One sentence: the single most important risk or opportunity in this portfolio right now.

Rules:
- No hype, no financial advice disclaimers, no "consult a professional" fluff.
- Cite the actual weights and P/L numbers provided.
- Total output under 280 words.`,
          messages: [{ role: "user", content: `Review this portfolio:\n\n${context}` }],
        });

        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        console.error("analyze-portfolio stream error:", err);
        controller.enqueue(encoder.encode(`\n\n[Error: review failed — please try again]`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
