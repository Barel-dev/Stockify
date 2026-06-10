"use client";

import { useEffect, useState } from "react";

type CandleResponse = { s: string; c?: number[] };

// Module-level cache so multiple cards for the same symbol (or re-mounts)
// don't refetch within a session.
const cache = new Map<string, number[]>();

/**
 * Tiny 7-day closing-price sparkline. Renders nothing until data arrives,
 * and stays hidden for symbols without candle data.
 */
export default function Sparkline({ symbol }: { symbol: string }) {
  const [points, setPoints] = useState<number[] | null>(cache.get(symbol) ?? null);

  useEffect(() => {
    const cached = cache.get(symbol);
    if (cached) {
      setPoints(cached);
      return;
    }
    let cancelled = false;
    const to = Math.floor(Date.now() / 1000);
    const from = to - 7 * 86400;
    fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&resolution=D`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CandleResponse | null) => {
        if (cancelled) return;
        if (data?.s === "ok" && data.c && data.c.length >= 2) {
          cache.set(symbol, data.c);
          setPoints(data.c);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (!points || points.length < 2) return null;

  const w = 120;
  const h = 32;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const coords = points.map((v, i) => `${(i * step).toFixed(1)},${(h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`);
  const up = points[points.length - 1] >= points[0];
  const color = up ? "#34d399" : "#fb7185";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8 mt-3" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.9"
      />
      <polygon
        points={`0,${h} ${coords.join(" ")} ${w},${h}`}
        fill={color}
        opacity="0.08"
      />
    </svg>
  );
}
