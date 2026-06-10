import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { finnhubFetch } from "@/lib/finnhub";
import { rateLimitRequest } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EarningsEntry = {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  hour: string;
  revenueActual: number | null;
  revenueEstimate: number | null;
  symbol: string;
};

type EarningsCalendarResponse = { earningsCalendar?: EarningsEntry[] };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const HOUR_LABEL: Record<string, string> = {
  bmo: "before open",
  amc: "after close",
};

function fmtRevenue(n: number | null): string {
  if (n == null) return "n/a";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  return `$${(n / 1e6).toFixed(0)}M`;
}

export async function POST(req: NextRequest) {
  const { from, to } = (await req.json().catch(() => ({}))) as { from?: string; to?: string };
  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return new Response(JSON.stringify({ error: "Invalid from/to dates" }), { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "AI analysis is not configured." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // Paid endpoint — throttle per IP like /api/analyze.
  const allowed = await rateLimitRequest(req, "analyze-earnings", 10, 3600);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit reached. Please try again later." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const data = await finnhubFetch<EarningsCalendarResponse>("/calendar/earnings", { from, to });
  const all = data?.earningsCalendar ?? [];
  if (all.length === 0) {
    return new Response(JSON.stringify({ error: "No earnings scheduled this week" }), { status: 404 });
  }

  // The reports that move markets: top 15 by expected revenue.
  const top = all
    .filter((e) => e.revenueEstimate != null || e.epsEstimate != null)
    .sort((a, b) => (b.revenueActual ?? b.revenueEstimate ?? 0) - (a.revenueActual ?? a.revenueEstimate ?? 0))
    .slice(0, 15);

  const lines = top.map((e) => {
    const reported = e.epsActual != null;
    return `- ${e.symbol} on ${e.date} (${HOUR_LABEL[e.hour] ?? "time TBD"}): est. revenue ${fmtRevenue(e.revenueEstimate)}, est. EPS ${e.epsEstimate != null ? `$${e.epsEstimate.toFixed(2)}` : "n/a"}${reported ? ` — REPORTED: EPS $${e.epsActual!.toFixed(2)}, revenue ${fmtRevenue(e.revenueActual)}` : ""}`;
  });

  const context = `
Earnings week ${from} to ${to}. Biggest ${top.length} reports by expected revenue (out of ${all.length} total):
${lines.join("\n")}
`.trim();

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1200,
          system: `You are a markets editor writing a weekly earnings preview for a retail trading dashboard.
Given the week's biggest scheduled reports, produce a terse Markdown briefing:

## The Big Ones
3-4 bullets on the highest-impact reports — why each matters and what the market will focus on.

## Day by Day
One short line per day that has notable reports (skip empty days).

## Themes To Watch
2-3 bullets on cross-cutting themes this slate could reveal (sector read-throughs, macro signals).

Rules:
- If an entry is marked REPORTED, treat it as a result, not a preview, and react to the beat/miss.
- No hype, no disclaimers. Use the company tickers as given.
- Total output under 280 words.`,
          messages: [{ role: "user", content: `Preview this earnings week:\n\n${context}` }],
        });

        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        console.error("analyze-earnings stream error:", err);
        controller.enqueue(encoder.encode(`\n\n[Error: preview failed — please try again]`));
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
