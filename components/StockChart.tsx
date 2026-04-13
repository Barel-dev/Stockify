"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CrosshairMode, CandlestickSeries, AreaSeries, HistogramSeries } from "lightweight-charts";

type CandleData = {
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  t: number[];
  v: number[];
  s: string;
};

type TimeRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y";

const RANGE_CONFIG: Record<TimeRange, { resolution: string; days: number }> = {
  "1D": { resolution: "5", days: 1 },
  "1W": { resolution: "15", days: 7 },
  "1M": { resolution: "60", days: 30 },
  "3M": { resolution: "D", days: 90 },
  "6M": { resolution: "D", days: 180 },
  "1Y": { resolution: "D", days: 365 },
};

export default function StockChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const [range, setRange] = useState<TimeRange>("3M");
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<"candle" | "line">("candle");

  useEffect(() => {
    if (!containerRef.current || !symbol) return;

    const container = containerRef.current;

    // Clean up old chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#6b7280",
        fontSize: 11,
        fontFamily: "Inter Tight, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(59,130,246,0.3)", width: 1, style: 2, labelBackgroundColor: "#1e3a5f" },
        horzLine: { color: "rgba(59,130,246,0.3)", width: 1, style: 2, labelBackgroundColor: "#1e3a5f" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.05)",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.05)",
        timeVisible: range === "1D" || range === "1W",
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
      width: container.clientWidth,
      height: 380,
    });

    chartRef.current = chart;

    const fetchData = async () => {
      setLoading(true);
      const config = RANGE_CONFIG[range];
      const to = Math.floor(Date.now() / 1000);
      const from = to - config.days * 86400;
      const assetType = symbol.includes(":") ? (symbol.toUpperCase().includes("OANDA") ? "forex" : "crypto") : "stock";

      try {
        const res = await fetch(
          `/api/candles?symbol=${encodeURIComponent(symbol)}&resolution=${config.resolution}&from=${from}&to=${to}&type=${assetType}`
        );
        if (!res.ok) throw new Error("Failed");
        const data: CandleData = await res.json();

        if (data.s !== "ok" || !data.t || data.t.length === 0) {
          setLoading(false);
          return;
        }

        if (chartType === "candle") {
          const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: "#10b981",
            downColor: "#ef4444",
            borderDownColor: "#ef4444",
            borderUpColor: "#10b981",
            wickDownColor: "#ef4444",
            wickUpColor: "#10b981",
          });
          const candles = data.t.map((t, i) => ({
            time: t as number,
            open: data.o[i],
            high: data.h[i],
            low: data.l[i],
            close: data.c[i],
          }));
          candleSeries.setData(candles as any);
        } else {
          const lineSeries = chart.addSeries(AreaSeries, {
            lineColor: "#3b82f6",
            topColor: "rgba(59,130,246,0.25)",
            bottomColor: "rgba(59,130,246,0.01)",
            lineWidth: 2,
          });
          const lines = data.t.map((t, i) => ({
            time: t as number,
            value: data.c[i],
          }));
          lineSeries.setData(lines as any);
        }

        // Volume
        if (data.v && data.v.length > 0) {
          const volumeSeries = chart.addSeries(HistogramSeries, {
            color: "rgba(59,130,246,0.15)",
            priceFormat: { type: "volume" },
            priceScaleId: "",
          });
          volumeSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.85, bottom: 0 },
          });
          const volumes = data.t.map((t, i) => ({
            time: t as number,
            value: data.v[i],
            color: data.c[i] >= data.o[i] ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
          }));
          volumeSeries.setData(volumes as any);
        }

        chart.timeScale().fitContent();
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [symbol, range, chartType]);

  return (
    <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {(["candle", "line"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                chartType === type
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-gray-500 hover:text-gray-300 border border-transparent"
              }`}
            >
              {type === "candle" ? "Candles" : "Line"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {(Object.keys(RANGE_CONFIG) as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                range === r
                  ? "bg-white/10 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
        <div ref={containerRef} className={loading ? "opacity-30" : ""} />
      </div>
    </div>
  );
}
