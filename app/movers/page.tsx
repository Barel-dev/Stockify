"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiZap, FiTrendingUp, FiTrendingDown, FiSunrise, FiRefreshCw } from "react-icons/fi";
import Navbar from "@/components/Navbar";
import Background from "@/components/Background";
import { useCurrency } from "@/lib/use-currency";

type Snapshot = {
  symbol: string;
  name: string | null;
  c: number;
  d: number;
  dp: number;
  gapPct: number | null;
  volume: number | null;
};

type Tab = "gainers" | "losers" | "gap-up" | "gap-down";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "gainers", label: "Gainers", icon: <FiTrendingUp size={13} /> },
  { key: "losers", label: "Losers", icon: <FiTrendingDown size={13} /> },
  { key: "gap-up", label: "Gap Up", icon: <FiSunrise size={13} /> },
  { key: "gap-down", label: "Gap Down", icon: <FiSunrise size={13} className="rotate-180" /> },
];

function formatVolume(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
}

function sortStocks(stocks: Snapshot[], tab: Tab): Snapshot[] {
  const byDay = (dir: 1 | -1) => [...stocks].sort((a, b) => dir * (b.dp - a.dp));
  const byGap = (dir: 1 | -1) =>
    stocks
      .filter((s) => s.gapPct != null)
      .sort((a, b) => dir * ((b.gapPct ?? 0) - (a.gapPct ?? 0)));
  switch (tab) {
    case "gainers": return byDay(1);
    case "losers": return byDay(-1);
    case "gap-up": return byGap(1);
    case "gap-down": return byGap(-1);
  }
}

export default function MoversPage() {
  const { symbol: cSym, convert: cConv } = useCurrency();
  const [stocks, setStocks] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("gainers");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const load = () => {
    fetch("/api/movers")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { stocks?: Snapshot[]; ts?: number } | null) => {
        if (data?.stocks) {
          setStocks(data.stocks);
          setUpdatedAt(data.ts ?? Date.now());
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  const rows = sortStocks(stocks, tab).slice(0, 25);

  return (
    <Background>
      <Navbar />

      <div className="relative z-10 pt-24 px-4 sm:px-6 pb-32">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <FiZap className="text-amber-400 text-2xl" />
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">Movers</h1>
          </div>
          <div className="flex items-center justify-between gap-3 mb-8 flex-wrap">
            <p className="text-gray-400 text-sm">
              Top movers and opening gaps across {stocks.length || "~70"} liquid large caps. Refreshes every minute.
            </p>
            {updatedAt && (
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500">
                <FiRefreshCw size={10} /> {new Date(updatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all ${
                  tab === t.key
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                    : "border-white/10 bg-white/[0.03] text-gray-400 hover:text-white hover:border-white/20"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-4 animate-pulse">
                  <div className="h-5 w-2/3 bg-white/5 rounded" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-20">No market data available right now.</p>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="hidden sm:grid grid-cols-[2rem_1.2fr_0.8fr_0.7fr_0.7fr_0.6fr] gap-3 px-5 py-1 text-[9px] uppercase tracking-[0.28em] text-gray-500 font-bold">
                <span>#</span>
                <span>Symbol</span>
                <span className="text-right">Price</span>
                <span className="text-right">Day %</span>
                <span className="text-right">Gap %</span>
                <span className="text-right">Volume</span>
              </div>

              {rows.map((s, i) => {
                const dayPos = s.dp >= 0;
                const gapPos = (s.gapPct ?? 0) >= 0;
                return (
                  <Link
                    key={s.symbol}
                    href={`/?ticker=${encodeURIComponent(s.symbol)}`}
                    className="group grid grid-cols-2 sm:grid-cols-[2rem_1.2fr_0.8fr_0.7fr_0.7fr_0.6fr] gap-3 items-center rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl px-5 py-3.5 transition-all hover:border-amber-500/30 hover:bg-black/70"
                  >
                    <span className="hidden sm:block text-xs font-black text-gray-600">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">{s.symbol}</p>
                      <p className="text-[10px] text-gray-500 truncate">{s.name ?? s.symbol}</p>
                    </div>
                    <p className="text-right text-sm font-bold text-white">
                      {cSym}{cConv(s.c).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className={`text-right text-sm font-black ${dayPos ? "text-emerald-400" : "text-rose-400"}`}>
                      {dayPos ? "+" : ""}{s.dp.toFixed(2)}%
                    </p>
                    <p className={`hidden sm:block text-right text-sm font-bold ${s.gapPct == null ? "text-gray-600" : gapPos ? "text-emerald-400/80" : "text-rose-400/80"}`}>
                      {s.gapPct == null ? "—" : `${gapPos ? "+" : ""}${s.gapPct.toFixed(2)}%`}
                    </p>
                    <p className="hidden sm:block text-right text-xs font-bold text-gray-400">{formatVolume(s.volume)}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Background>
  );
}
