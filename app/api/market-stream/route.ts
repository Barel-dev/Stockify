import type { NextRequest } from "next/server";
import { rateLimitRequest } from "@/lib/cache";
import { fetchYahooQuote } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel kills the function at this limit; EventSource on the client
// auto-reconnects, so the stream resumes in a fresh invocation.
export const maxDuration = 60;

const INDICES = [
  { yahoo: "^GSPC", name: "S&P 500" },
  { yahoo: "^IXIC", name: "NASDAQ" },
  { yahoo: "^DJI", name: "DOW" },
  { yahoo: "^RUT", name: "Russell 2K" },
];

// Interval between pushes (ms)
const TICK_MS = 10_000;

async function snapshot() {
  const idxData = await Promise.all(
    INDICES.map(async (idx) => {
      const q = await fetchYahooQuote(idx.yahoo);
      return q
        ? { symbol: idx.yahoo, name: idx.name, c: q.c, dp: q.dp, d: q.d }
        : null;
    })
  );
  return {
    indices: idxData.filter(Boolean),
    ts: Date.now(),
  };
}

export async function GET(req: NextRequest) {
  // Each open stream holds a function execution; cap how often one IP can
  // (re)connect. EventSource reconnects roughly once a minute here, so 30
  // per 5 minutes leaves plenty of headroom for legitimate tabs.
  if (!(await rateLimitRequest(req, "market-stream", 30, 300))) {
    return new Response("Too many requests", { status: 429 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Initial push
      try {
        send(await snapshot());
      } catch {
        /* ignore */
      }

      const interval = setInterval(async () => {
        if (closed) return;
        try {
          send(await snapshot());
        } catch {
          /* ignore */
        }
      }, TICK_MS);

      // Heartbeat comment every 20s so proxies don't close the connection
      const heartbeat = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(`: hb ${Date.now()}\n\n`));
      }, 20_000);

      // Close on client disconnect
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
