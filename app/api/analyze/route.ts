import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { finnhubFetch } from "@/lib/finnhub";

type Quote = { c: number; d: number; dp: number; h: number; l: number; o: number; pc: number };
type Company = { name?: string; finnhubIndustry?: string; marketCapitalization?: number; country?: string };
type Metrics = { metric?: Record<string, number | undefined> };
type NewsItem = { headline?: string; summary?: string; datetime?: number };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { symbol } = (await req.json().catch(() => ({}))) as { symbol?: string };
  if (!symbol) {
    return new Response(JSON.stringify({ error: "Missing symbol" }), { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "AI analysis is not configured. Set ANTHROPIC_API_KEY in environment." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // Gather context from existing Finnhub endpoints
  const sym = symbol.toUpperCase();
  const [quote, company, metrics, news] = await Promise.all([
    finnhubFetch<Quote>("/quote", { symbol: sym }).catch(() => null),
    finnhubFetch<Company>("/stock/profile2", { symbol: sym }).catch(() => null),
    finnhubFetch<Metrics>("/stock/metric", { symbol: sym, metric: "all" }).catch(() => null),
    finnhubFetch<NewsItem[]>("/company-news", {
      symbol: sym,
      from: new Date(Date.now() - 14 * 86400_000).toISOString().slice(0, 10),
      to: new Date().toISOString().slice(0, 10),
    }).catch(() => null),
  ]);

  if (!quote || !quote.c) {
    return new Response(JSON.stringify({ error: `No data for ${sym}` }), { status: 404 });
  }

  const m = metrics?.metric ?? {};
  const recentNews = (news ?? [])
    .slice(0, 6)
    .map((n) => `- ${n.headline ?? ""}: ${(n.summary ?? "").slice(0, 200)}`)
    .join("\n");

  const context = `
Ticker: ${sym}
Company: ${company?.name ?? sym} (${company?.finnhubIndustry ?? "n/a"}, ${company?.country ?? "n/a"})
Market Cap: ${company?.marketCapitalization ? `$${company.marketCapitalization.toFixed(0)}M` : "n/a"}
Current Price: $${quote.c.toFixed(2)} (${quote.dp.toFixed(2)}% today, change $${quote.d.toFixed(2)})
Today's Range: $${quote.l.toFixed(2)} - $${quote.h.toFixed(2)}
P/E (TTM): ${m.peBasicExclExtraTTM ?? "n/a"}
EPS (TTM): ${m.epsBasicExclExtraItemsTTM ?? "n/a"}
52-Week Range: $${m["52WeekLow"] ?? "?"} - $${m["52WeekHigh"] ?? "?"}
Beta: ${m.beta ?? "n/a"}
Dividend Yield: ${m.dividendYieldIndicatedAnnual ?? "n/a"}%
ROE (TTM): ${m.roeTTM ?? "n/a"}
Debt/Equity: ${m["totalDebt/totalEquityQuarterly"] ?? "n/a"}

Recent News (last 14 days):
${recentNews || "(no recent news)"}
`.trim();

  const client = new Anthropic({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1200,
          system: `You are a senior equity analyst writing for a retail investor dashboard.
Given market data for one ticker, produce a terse, structured analysis in Markdown with these sections:

## Bull Case
3 concise bullet points — what's working, why it could keep working.

## Bear Case
3 concise bullet points — risks, what could break the thesis.

## Technical Read
1-2 sentences on momentum, volatility, and where price sits in its recent range.

## Bottom Line
One sentence: neutral/constructive/cautious stance and the single factor a retail investor should watch next.

Rules:
- No hype, no financial advice disclaimers, no "do your own research" fluff.
- Cite concrete numbers when available.
- If data is missing, say so briefly and move on.
- Total output under 300 words.`,
          messages: [{ role: "user", content: `Analyze this stock:\n\n${context}` }],
        });

        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown error";
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
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
