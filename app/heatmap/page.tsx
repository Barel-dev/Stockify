"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiGrid, FiRefreshCw } from "react-icons/fi";
import Navbar from "@/components/Navbar";

type QuoteData = { c: number; dp: number };

type SectorStock = {
  symbol: string;
  name: string;
  sector: string;
  quote: QuoteData | null;
};

const SECTOR_STOCKS: { symbol: string; name: string; sector: string }[] = [
  // Technology
  { symbol: "AAPL", name: "Apple", sector: "Technology" },
  { symbol: "MSFT", name: "Microsoft", sector: "Technology" },
  { symbol: "NVDA", name: "NVIDIA", sector: "Technology" },
  { symbol: "GOOG", name: "Alphabet", sector: "Technology" },
  { symbol: "META", name: "Meta", sector: "Technology" },
  { symbol: "TSM", name: "TSMC", sector: "Technology" },
  // Healthcare
  { symbol: "UNH", name: "UnitedHealth", sector: "Healthcare" },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare" },
  { symbol: "LLY", name: "Eli Lilly", sector: "Healthcare" },
  { symbol: "PFE", name: "Pfizer", sector: "Healthcare" },
  // Finance
  { symbol: "JPM", name: "JPMorgan", sector: "Finance" },
  { symbol: "V", name: "Visa", sector: "Finance" },
  { symbol: "BAC", name: "Bank of America", sector: "Finance" },
  { symbol: "GS", name: "Goldman Sachs", sector: "Finance" },
  // Energy
  { symbol: "XOM", name: "ExxonMobil", sector: "Energy" },
  { symbol: "CVX", name: "Chevron", sector: "Energy" },
  { symbol: "COP", name: "ConocoPhillips", sector: "Energy" },
  // Consumer
  { symbol: "AMZN", name: "Amazon", sector: "Consumer" },
  { symbol: "TSLA", name: "Tesla", sector: "Consumer" },
  { symbol: "WMT", name: "Walmart", sector: "Consumer" },
  { symbol: "NKE", name: "Nike", sector: "Consumer" },
  // Industrial
  { symbol: "CAT", name: "Caterpillar", sector: "Industrial" },
  { symbol: "BA", name: "Boeing", sector: "Industrial" },
  { symbol: "HON", name: "Honeywell", sector: "Industrial" },
  // Communication
  { symbol: "NFLX", name: "Netflix", sector: "Communication" },
  { symbol: "DIS", name: "Disney", sector: "Communication" },
  { symbol: "CMCSA", name: "Comcast", sector: "Communication" },
];

function getHeatColor(dp: number): string {
  if (dp >= 3) return "bg-emerald-500";
  if (dp >= 2) return "bg-emerald-500/80";
  if (dp >= 1) return "bg-emerald-600/70";
  if (dp >= 0.5) return "bg-emerald-700/60";
  if (dp >= 0) return "bg-emerald-900/40";
  if (dp >= -0.5) return "bg-rose-900/40";
  if (dp >= -1) return "bg-rose-700/60";
  if (dp >= -2) return "bg-rose-600/70";
  if (dp >= -3) return "bg-rose-500/80";
  return "bg-rose-500";
}

export default function HeatmapPage() {
  const [stocks, setStocks] = useState<SectorStock[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // Batch in groups of 8 with 1.2s delay to stay under Finnhub's 60/min rate limit
      const BATCH = 8;
      const results: SectorStock[] = [];
      for (let i = 0; i < SECTOR_STOCKS.length; i += BATCH) {
        if (i > 0) await new Promise((r) => setTimeout(r, 1200));
        const batch = SECTOR_STOCKS.slice(i, i + BATCH);
        const batchResults = await Promise.all(
          batch.map(async (s) => {
            try {
              const res = await fetch(`/api/quote?symbol=${encodeURIComponent(s.symbol)}`);
              const quote = res.ok ? ((await res.json()) as QuoteData) : null;
              return { ...s, quote };
            } catch {
              return { ...s, quote: null };
            }
          })
        );
        results.push(...batchResults);
        // Update UI progressively so user sees data appearing
        setStocks([...results]);
      }
      setStocks(results);
    } catch {
      setStocks(SECTOR_STOCKS.map((s) => ({ ...s, quote: null })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Group by sector
  const sectors = new Map<string, SectorStock[]>();
  for (const s of stocks) {
    const arr = sectors.get(s.sector) ?? [];
    arr.push(s);
    sectors.set(s.sector, arr);
  }

  // Sector averages
  const sectorAvgs = Array.from(sectors.entries()).map(([name, items]) => {
    const withQuote = items.filter((i) => i.quote && i.quote.c > 0);
    const avg = withQuote.length > 0 ? withQuote.reduce((s, i) => s + (i.quote?.dp ?? 0), 0) / withQuote.length : 0;
    return { name, avg, items };
  }).sort((a, b) => b.avg - a.avg);

  return (
    <div className="bg-[#050505] text-white font-sans min-h-screen">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[5%] left-[10%] w-[500px] h-[500px] bg-blue-600/25 rounded-full blur-[120px] animate-blob" />
        <div className="absolute bottom-[5%] right-[10%] w-[450px] h-[450px] bg-indigo-600/25 rounded-full blur-[120px] animate-blob" style={{ animationDelay: "2s" }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
      </div>

      <Navbar />

      <div className="relative z-10 pt-28 px-4 sm:px-6 pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <FiGrid className="text-blue-400 text-2xl" />
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">Market Heatmap</h1>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-300 hover:border-blue-500/30 hover:text-white transition-all disabled:opacity-50"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} size={12} />
              Refresh
            </button>
          </div>
          <p className="text-gray-400 text-sm mb-8">Live sector performance across major stocks.</p>

          {/* Legend */}
          <div className="flex items-center justify-center gap-1 mb-8">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mr-2">Bearish</span>
            {[
              "bg-rose-500", "bg-rose-500/80", "bg-rose-600/70", "bg-rose-700/60", "bg-rose-900/40",
              "bg-emerald-900/40", "bg-emerald-700/60", "bg-emerald-600/70", "bg-emerald-500/80", "bg-emerald-500",
            ].map((color, i) => (
              <div key={i} className={`${color} w-6 h-3 ${i === 0 ? "rounded-l-full" : ""} ${i === 9 ? "rounded-r-full" : ""}`} />
            ))}
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider ml-2">Bullish</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 animate-pulse h-24" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {sectorAvgs.map(({ name, avg, items }) => (
                <div key={name}>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-lg font-black tracking-tight">{name}</h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${avg >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                      {avg >= 0 ? "+" : ""}{avg.toFixed(2)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {items.map((stock) => {
                      const dp = stock.quote?.dp ?? 0;
                      const price = stock.quote?.c ?? 0;
                      return (
                        <Link
                          key={stock.symbol}
                          href={`/?ticker=${encodeURIComponent(stock.symbol)}`}
                          className={`group relative rounded-2xl ${getHeatColor(dp)} border border-white/10 p-4 transition-all hover:border-white/30 hover:scale-[1.02]`}
                        >
                          <p className="text-sm font-black text-white">{stock.symbol}</p>
                          <p className="text-[10px] text-white/60 truncate">{stock.name}</p>
                          {price > 0 && (
                            <>
                              <p className="mt-2 text-lg font-black text-white">${price.toFixed(2)}</p>
                              <p className={`text-xs font-bold ${dp >= 0 ? "text-white/90" : "text-white/90"}`}>
                                {dp >= 0 ? "+" : ""}{dp.toFixed(2)}%
                              </p>
                            </>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
