"use client";

import { useEffect, useState } from "react";
import { FiGitMerge } from "react-icons/fi";

type CandleResponse = { s: string; t?: number[]; c?: number[] };

/** Pearson correlation of two equal-length series. */
function pearson(x: number[], y: number[]): number | null {
  const n = Math.min(x.length, y.length);
  if (n < 10) return null; // not enough overlap to be meaningful
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += x[i];
    sy += y[i];
    sxx += x[i] * x[i];
    syy += y[i] * y[i];
    sxy += x[i] * y[i];
  }
  const cov = sxy / n - (sx / n) * (sy / n);
  const vx = sxx / n - (sx / n) ** 2;
  const vy = syy / n - (sy / n) ** 2;
  if (vx <= 0 || vy <= 0) return null;
  return cov / Math.sqrt(vx * vy);
}

/** Align two close series on shared dates and return paired daily returns. */
function pairedReturns(
  a: Map<string, number>,
  b: Map<string, number>
): [number[], number[]] {
  const shared = [...a.keys()].filter((d) => b.has(d)).sort();
  const ra: number[] = [];
  const rb: number[] = [];
  for (let i = 1; i < shared.length; i++) {
    const pa = a.get(shared[i - 1])!;
    const pb = b.get(shared[i - 1])!;
    if (pa > 0 && pb > 0) {
      ra.push(a.get(shared[i])! / pa - 1);
      rb.push(b.get(shared[i])! / pb - 1);
    }
  }
  return [ra, rb];
}

function cellColor(r: number): string {
  // rose (-1) → near-transparent (0) → emerald (+1)
  const alpha = Math.min(Math.abs(r) * 0.55, 0.55);
  return r >= 0 ? `rgba(16,185,129,${alpha})` : `rgba(244,63,94,${alpha})`;
}

/**
 * Correlation matrix of daily returns over the last 6 months for 2-4 symbols.
 * Fetches its own candle data; renders nothing until everything loads.
 */
export default function CorrelationMatrix({ symbols }: { symbols: string[] }) {
  const [matrix, setMatrix] = useState<(number | null)[][] | null>(null);

  const key = symbols.join(",");

  useEffect(() => {
    if (symbols.length < 2) return;
    let cancelled = false;
    setMatrix(null);

    const to = Math.floor(Date.now() / 1000);
    const from = to - 182 * 86400;

    Promise.all(
      symbols.map(async (sym) => {
        try {
          const res = await fetch(
            `/api/candles?symbol=${encodeURIComponent(sym)}&from=${from}&to=${to}&resolution=D`
          );
          if (!res.ok) return null;
          const data = (await res.json()) as CandleResponse;
          if (data.s !== "ok" || !data.t || !data.c) return null;
          const byDate = new Map<string, number>();
          for (let i = 0; i < data.t.length; i++) {
            byDate.set(new Date(data.t[i] * 1000).toISOString().slice(0, 10), data.c[i]);
          }
          return byDate;
        } catch {
          return null;
        }
      })
    ).then((seriesList) => {
      if (cancelled) return;
      const m: (number | null)[][] = symbols.map((_, i) =>
        symbols.map((_, j) => {
          if (i === j) return 1;
          const a = seriesList[i];
          const b = seriesList[j];
          if (!a || !b) return null;
          const [ra, rb] = pairedReturns(a, b);
          return pearson(ra, rb);
        })
      );
      // Hide the section when nothing correlates (e.g. all candle fetches failed).
      const hasData = m.some((row, i) => row.some((v, j) => i !== j && v != null));
      setMatrix(hasData ? m : null);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!matrix) return null;

  return (
    <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl">
      <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-gray-500 font-bold mb-2">
        <FiGitMerge className="text-blue-400" />
        <span>Correlation Matrix</span>
      </p>
      <p className="text-sm text-gray-400 leading-6 mb-5">
        Pearson correlation of daily returns over the last 6 months. +1 moves together, −1 moves opposite —
        low correlation is what diversification looks like.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-24" />
              {symbols.map((s) => (
                <th key={s} className="text-[10px] font-black uppercase tracking-wider text-gray-400 pb-1">
                  {s.includes(":") ? s.split(":")[1] : s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {symbols.map((rowSym, i) => (
              <tr key={rowSym}>
                <td className="text-[10px] font-black uppercase tracking-wider text-gray-400 pr-2 text-right">
                  {rowSym.includes(":") ? rowSym.split(":")[1] : rowSym}
                </td>
                {symbols.map((colSym, j) => {
                  const v = matrix[i][j];
                  return (
                    <td
                      key={colSym}
                      className="rounded-xl text-center text-sm font-black text-white py-3 px-2 border border-white/5"
                      style={{ backgroundColor: v == null ? "rgba(255,255,255,0.02)" : cellColor(v) }}
                    >
                      {v == null ? "—" : v.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
