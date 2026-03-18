"use client";

import { useMemo, useRef, useState } from "react";
import {
  FiSearch,
  FiTrendingUp,
  FiArrowUp,
  FiArrowDown,
  FiActivity,
  FiBarChart2,
  FiCpu,
  FiTarget,
  FiGlobe,
  FiShield,
  FiZap,
  FiLayers,
  FiBriefcase,
} from "react-icons/fi";

const API_KEY = "d6t63tpr01qoqoisd0p0d6t63tpr01qoqoisd0pg";

type SuggestionItem = {
  symbol: string;
  description: string;
};

type FinnhubSearchResult = {
  symbol: string;
  description?: string;
  displaySymbol?: string;
  type?: string;
};

type AssetType = "stock" | "crypto" | "forex";

type QuoteData = {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
};

type ProfileData = {
  country?: string;
  currency?: string;
  exchange?: string;
  finnhubIndustry?: string;
  ipo?: string;
  logo?: string;
  marketCapitalization?: number;
  name?: string;
  shareOutstanding?: number;
  ticker?: string;
  weburl?: string;
};

type CandleData = {
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  t: number[];
  v: number[];
  s: string;
};

type RecommendationTrend = {
  buy: number;
  hold: number;
  period: string;
  sell: number;
  strongBuy: number;
  strongSell: number;
  symbol: string;
};

type BasicFinancialsData = {
  metric?: {
    "52WeekHigh"?: number;
    "52WeekLow"?: number;
    beta?: number;
    peBasicExclExtraTTM?: number;
    epsBasicExclExtraItemsTTM?: number;
    dividendYieldIndicatedAnnual?: number;
    currentRatioQuarterly?: number;
    totalDebtToEquityQuarterly?: number;
  };
};

const MARKET_DB: SuggestionItem[] = [
  { symbol: "BINANCE:BTCUSDT", description: "Bitcoin (BTC / USD)" },
  { symbol: "BINANCE:ETHUSDT", description: "Ethereum (ETH / USD)" },
  { symbol: "BINANCE:SOLUSDT", description: "Solana (SOL / USD)" },
  { symbol: "OANDA:EUR_USD", description: "Euro / US Dollar (Forex)" },
  { symbol: "OANDA:GBP_USD", description: "British Pound / US Dollar" },
];

const cleanSymbol = (symbol: string) =>
  symbol.replace("BINANCE:", "").replace("COINBASE:", "").replace("OANDA:", "");

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const getAssetType = (symbol: string): AssetType => {
  if (symbol.startsWith("BINANCE:") || symbol.startsWith("COINBASE:")) return "crypto";
  if (symbol.startsWith("OANDA:")) return "forex";
  return "stock";
};

const getCandleEndpoint = (symbol: string) => {
  const type = getAssetType(symbol);
  if (type === "crypto") return "crypto/candle";
  if (type === "forex") return "forex/candle";
  return "stock/candle";
};

const formatMoney = (value?: number | null, digits = 2) =>
  typeof value === "number" && Number.isFinite(value) ? `$${value.toFixed(digits)}` : "—";

const formatPercent = (value?: number | null, digits = 2) =>
  typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";

const formatCompact = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(value)
    : "—";

const formatDateTime = (unix?: number | null) =>
  unix
    ? new Date(unix * 1000).toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const average = (arr: number[]) =>
  arr.length ? arr.reduce((sum, v) => sum + v, 0) / arr.length : 0;

const calculateSMA = (values: number[], period: number) => {
  if (values.length < period) return null;
  return average(values.slice(-period));
};

const calculateRSI = (values: number[], period = 14) => {
  if (values.length <= period) return null;

  let gains = 0;
  let losses = 0;

  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  if (losses === 0) return 100;

  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;

  return 100 - 100 / (1 + rs);
};

const calculateVolatility = (values: number[], period = 30) => {
  if (values.length <= period) return null;

  const recent = values.slice(-(period + 1));
  const returns = recent
    .slice(1)
    .map((price, index) => (recent[index] ? (price - recent[index]) / recent[index] : 0))
    .filter((n) => Number.isFinite(n));

  if (!returns.length) return null;

  const mean = average(returns);
  const variance = average(returns.map((r) => Math.pow(r - mean, 2)));

  return Math.sqrt(variance) * 100;
};

const getRangePercent = (
  current?: number | null,
  low?: number | null,
  high?: number | null
) => {
  if (
    typeof current !== "number" ||
    typeof low !== "number" ||
    typeof high !== "number" ||
    high === low
  ) {
    return null;
  }

  return clamp(((current - low) / (high - low)) * 100);
};

const getSparklinePoints = (values: number[], width = 520, height = 140) => {
  if (values.length < 2) return "";

  const max = Math.max(...values);
  const min = Math.min(...values);

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = max === min ? height / 2 : height - ((value - min) / (max - min)) * height;
      return `${x},${y}`;
    })
    .join(" ");
};

const getSignalFromScore = (score: number) => {
  if (score >= 78) {
    return {
      text: "STRONG BUY",
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    };
  }

  if (score >= 62) {
    return {
      text: "BUY",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    };
  }

  if (score >= 45) {
    return {
      text: "HOLD / NEUTRAL",
      color: "text-gray-300",
      bg: "bg-gray-500/10",
      border: "border-gray-500/20",
    };
  }

  if (score >= 28) {
    return {
      text: "SELL",
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
    };
  }

  return {
    text: "STRONG SELL",
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  };
};

const dedupeSuggestions = (items: SuggestionItem[]) => {
  const map = new Map<string, SuggestionItem>();

  for (const item of items) {
    if (!map.has(item.symbol)) {
      map.set(item.symbol, item);
    }
  }

  return Array.from(map.values());
};

const resolveSearchSymbol = (raw: string) => {
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return "";

  const exact = MARKET_DB.find(
    (item) =>
      item.symbol.toUpperCase() === trimmed || cleanSymbol(item.symbol).toUpperCase() === trimmed
  );

  if (exact) return exact.symbol;

  const localMatches = MARKET_DB.filter(
    (item) =>
      item.symbol.toUpperCase().includes(trimmed) ||
      cleanSymbol(item.symbol).toUpperCase().includes(trimmed) ||
      item.description.toUpperCase().includes(trimmed)
  );

  if (localMatches.length === 1) return localMatches[0].symbol;

  return trimmed;
};

export default function Home() {
  const [ticker, setTicker] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [stockData, setStockData] = useState<QuoteData | null>(null);
  const [companyData, setCompanyData] = useState<ProfileData | null>(null);
  const [candlesData, setCandlesData] = useState<CandleData | null>(null);
  const [recommendationData, setRecommendationData] = useState<RecommendationTrend[]>([]);
  const [basicFinancials, setBasicFinancials] = useState<BasicFinancialsData | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const glowRef = useRef<HTMLDivElement>(null);
  const analysisRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (glowRef.current) {
      glowRef.current.style.transform = `translate(${e.clientX - 150}px, ${e.clientY - 150}px)`;
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setTicker(val);

    if (val.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const localMatches = MARKET_DB.filter(
      (c) =>
        c.symbol.toUpperCase().includes(val) ||
        cleanSymbol(c.symbol).toUpperCase().includes(val) ||
        c.description.toUpperCase().includes(val)
    );

    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/search?q=${encodeURIComponent(val)}&token=${API_KEY}`
      );
      const data: { result?: FinnhubSearchResult[] } = await res.json();

      const apiResults: SuggestionItem[] = (data.result ?? []).slice(0, 5).map((item) => ({
        symbol: item.symbol,
        description: item.description || item.displaySymbol || item.symbol,
      }));

      setSuggestions(dedupeSuggestions([...localMatches, ...apiResults]).slice(0, 6));
      setShowSuggestions(true);
    } catch (err) {
      console.error(err);
      setSuggestions(localMatches.slice(0, 6));
      setShowSuggestions(localMatches.length > 0);
    }
  };

  const handleSelectSuggestion = (selectedSymbol: string) => {
    setTicker(selectedSymbol);
    setShowSuggestions(false);
    handleSearch(selectedSymbol);
  };

  const handleSearch = async (searchSymbol = ticker) => {
    const resolvedSymbol = resolveSearchSymbol(searchSymbol);

    if (!resolvedSymbol) return;

    setTicker(resolvedSymbol);
    setLoading(true);
    setError("");
    setShowSuggestions(false);

    try {
      const assetType = getAssetType(resolvedSymbol);
      const now = Math.floor(Date.now() / 1000);
      const from = now - 60 * 60 * 24 * 120;
      const candleEndpoint = getCandleEndpoint(resolvedSymbol);

      const baseRequests = [
        fetch(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
            resolvedSymbol
          )}&token=${API_KEY}`
        ),
        fetch(
          `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(
            resolvedSymbol
          )}&token=${API_KEY}`
        ),
        fetch(
          `https://finnhub.io/api/v1/${candleEndpoint}?symbol=${encodeURIComponent(
            resolvedSymbol
          )}&resolution=D&from=${from}&to=${now}&token=${API_KEY}`
        ),
      ];

      const extraRequests =
        assetType === "stock"
          ? [
              fetch(
                `https://finnhub.io/api/v1/stock/recommendation?symbol=${encodeURIComponent(
                  resolvedSymbol
                )}&token=${API_KEY}`
              ),
              fetch(
                `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(
                  resolvedSymbol
                )}&metric=all&token=${API_KEY}`
              ),
            ]
          : [];

      const responses = await Promise.all([...baseRequests, ...extraRequests]);
      const payloads = await Promise.all(responses.map((res) => res.json()));

      const quoteData = (payloads[0] ?? {}) as QuoteData;
      const profileData = (payloads[1] ?? {}) as ProfileData;
      const candles = (payloads[2] ?? null) as CandleData | null;
      const recs = (payloads[3] ?? []) as RecommendationTrend[];
      const metrics = (payloads[4] ?? null) as BasicFinancialsData | null;

      const latestCloseFromCandles =
        candles?.c?.length ? candles.c[candles.c.length - 1] : 0;

      const normalizedQuote: QuoteData = {
        c: quoteData?.c || latestCloseFromCandles || 0,
        d: quoteData?.d ?? 0,
        dp: quoteData?.dp ?? 0,
        h: quoteData?.h || (candles?.h?.length ? candles.h[candles.h.length - 1] : 0),
        l: quoteData?.l || (candles?.l?.length ? candles.l[candles.l.length - 1] : 0),
        o: quoteData?.o || (candles?.o?.length ? candles.o[candles.o.length - 1] : 0),
        pc: quoteData?.pc ?? 0,
        t: quoteData?.t ?? (candles?.t?.length ? candles.t[candles.t.length - 1] : 0),
      };

      if (!normalizedQuote.c) {
        setError(
          `No data found for ${resolvedSymbol}. Please select a valid ticker from the dropdown.`
        );
        setStockData(null);
        setCompanyData(null);
        setCandlesData(null);
        setRecommendationData([]);
        setBasicFinancials(null);
        return;
      }

      setStockData(normalizedQuote);
      setCompanyData(profileData);
      setCandlesData(candles?.s === "ok" ? candles : null);
      setRecommendationData(Array.isArray(recs) ? recs : []);
      setBasicFinancials(metrics?.metric ? metrics : null);

      setTimeout(() => {
        analysisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 250);
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const analysis = useMemo(() => {
    if (!stockData) return null;

    const closes = candlesData?.c ?? [];
    const highs = candlesData?.h ?? [];
    const lows = candlesData?.l ?? [];
    const volumes = candlesData?.v ?? [];
    const assetType = getAssetType(ticker);

    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const prevSma20 = closes.length >= 21 ? average(closes.slice(-21, -1)) : null;
    const rsi14 = calculateRSI(closes, 14);
    const volatility30d = calculateVolatility(closes, 30);
    const dayRangePos = getRangePercent(stockData.c, stockData.l, stockData.h);

    const week52High = basicFinancials?.metric?.["52WeekHigh"] ?? null;
    const week52Low = basicFinancials?.metric?.["52WeekLow"] ?? null;
    const week52Pos = getRangePercent(stockData.c, week52Low, week52High);

    const latestVolume = volumes.length ? volumes[volumes.length - 1] : null;
    const avg20Volume = volumes.length >= 20 ? average(volumes.slice(-20)) : null;
    const volumeRatio =
      typeof latestVolume === "number" &&
      typeof avg20Volume === "number" &&
      avg20Volume !== 0
        ? latestVolume / avg20Volume
        : null;

    const latestRec = recommendationData?.[0] ?? null;
    const totalRec = latestRec
      ? latestRec.strongBuy +
        latestRec.buy +
        latestRec.hold +
        latestRec.sell +
        latestRec.strongSell
      : 0;

    const bullishRec = latestRec ? latestRec.strongBuy + latestRec.buy : 0;
    const bearishRec = latestRec ? latestRec.sell + latestRec.strongSell : 0;
    const bullishPct = totalRec ? (bullishRec / totalRec) * 100 : null;
    const bearishPct = totalRec ? (bearishRec / totalRec) * 100 : null;

    const recentResistance = highs.length ? Math.max(...highs.slice(-20)) : stockData.h;
    const recentSupport = lows.length ? Math.min(...lows.slice(-20)) : stockData.l;
    const pivot = (stockData.h + stockData.l + stockData.c) / 3;
    const openGapPct = stockData.pc ? ((stockData.o - stockData.pc) / stockData.pc) * 100 : null;

    let score = 50;

    if (typeof sma20 === "number") score += stockData.c > sma20 ? 12 : -10;
    if (typeof sma20 === "number" && typeof sma50 === "number") score += sma20 > sma50 ? 12 : -10;
    if (typeof sma20 === "number" && typeof prevSma20 === "number") score += sma20 > prevSma20 ? 8 : -6;

    if (typeof rsi14 === "number") {
      if (rsi14 >= 55 && rsi14 <= 70) score += 12;
      else if (rsi14 > 70) score += 4;
      else if (rsi14 < 40) score -= 12;
      else if (rsi14 < 50) score -= 4;
    }

    if (typeof stockData.dp === "number") {
      score += Math.max(-10, Math.min(10, stockData.dp * 1.8));
    }

    if (typeof week52Pos === "number") {
      if (week52Pos > 70) score += 8;
      else if (week52Pos < 30) score -= 6;
    }

    if (typeof bullishPct === "number") {
      score += (bullishPct - 50) / 5;
    }

    if (typeof volumeRatio === "number") {
      if (volumeRatio > 1.2 && stockData.dp > 0) score += 6;
      else if (volumeRatio > 1.2 && stockData.dp < 0) score -= 4;
    }

    score = clamp(score, 0, 100);

    const signal = getSignalFromScore(score);

    const trendBias =
      score >= 65
        ? "Bullish continuation bias"
        : score <= 35
        ? "Bearish pressure bias"
        : "Balanced / range bias";

    const riskLevel =
      (typeof volatility30d === "number" && volatility30d > 3.5) ||
      (typeof basicFinancials?.metric?.beta === "number" &&
        (basicFinancials.metric.beta ?? 0) > 1.4)
        ? "Aggressive"
        : (typeof volatility30d === "number" && volatility30d > 2) ||
          (typeof basicFinancials?.metric?.beta === "number" &&
            (basicFinancials.metric.beta ?? 0) > 1.1)
        ? "Medium"
        : "Controlled";

    let summary = `${cleanSymbol(ticker)} `;

    if (score >= 78) {
      summary += "shows a strong upside structure with price, momentum, and positioning all aligned.";
    } else if (score >= 62) {
      summary += "keeps a constructive tone, with buyers still controlling the short-term structure.";
    } else if (score <= 28) {
      summary += "is under heavy selling pressure, with weak confirmation across trend metrics.";
    } else if (score <= 45) {
      summary += "leans bearish as momentum is soft and price is struggling to reclaim key levels.";
    } else {
      summary += "is neutral for now, trading in a mixed structure while the market waits for confirmation.";
    }

    if (typeof rsi14 === "number") {
      if (rsi14 > 70) summary += ` RSI is ${rsi14.toFixed(1)}, which suggests overheated momentum.`;
      else if (rsi14 < 30) summary += ` RSI is ${rsi14.toFixed(1)}, which points to oversold conditions.`;
      else if (rsi14 >= 55) summary += ` RSI is ${rsi14.toFixed(1)}, a healthy bullish momentum reading.`;
      else if (rsi14 <= 45) summary += ` RSI is ${rsi14.toFixed(1)}, reflecting soft momentum.`;
      else summary += ` RSI is ${rsi14.toFixed(1)}, which is fairly balanced.`;
    }

    if (assetType === "stock" && typeof bullishPct === "number") {
      summary += ` Analyst consensus is ${
        bullishPct >= 60 ? "supportive" : bullishPct <= 40 ? "cautious" : "mixed"
      }.`;
    }

    return {
      assetType,
      score,
      signal,
      trendBias,
      riskLevel,
      sma20,
      sma50,
      rsi14,
      volatility30d,
      dayRangePos,
      week52High,
      week52Low,
      week52Pos,
      latestRec,
      totalRec,
      bullishPct,
      bearishPct,
      recentResistance,
      recentSupport,
      pivot,
      openGapPct,
      volumeRatio,
      latestVolume,
      avg20Volume,
      sparklinePoints: getSparklinePoints(closes.slice(-40)),
      summary,
    };
  }, [basicFinancials, candlesData, recommendationData, stockData, ticker]);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes superFloat {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(100px, -100px) scale(1.3); }
          66% { transform: translate(-100px, 100px) scale(0.7); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .force-animate-blob {
          animation: superFloat 4s infinite alternate ease-in-out;
        }
        .force-delay {
          animation-delay: 2s;
        }
        ::-webkit-scrollbar { display: none; }
      `,
        }}
      />

      <div onMouseMove={handleMouseMove} className="bg-[#050505] text-white font-sans relative">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div
            ref={glowRef}
            className="absolute top-0 left-0 h-[300px] w-[300px] rounded-full bg-gradient-to-r from-blue-600/20 to-indigo-600/20 blur-[80px] transition-transform duration-75 ease-out"
            style={{ transform: "translate(-500px, -500px)" }}
          ></div>
          <div className="absolute top-[5%] left-[10%] w-[400px] h-[400px] bg-blue-600/30 rounded-full blur-[100px] force-animate-blob"></div>
          <div className="absolute bottom-[5%] right-[10%] w-[400px] h-[400px] bg-indigo-600/30 rounded-full blur-[100px] force-animate-blob force-delay"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
        </div>

        <main className="min-h-screen flex items-center justify-center p-6 relative z-10">
          <div className="max-w-2xl w-full">
            <div className="text-center space-y-4 mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wider uppercase backdrop-blur-sm">
                <FiTrendingUp /> Real-time Market Data
              </div>

              <h1 className="text-7xl font-black tracking-tighter bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent drop-shadow-2xl">
                STOCKIFY
              </h1>

              <p className="text-gray-400 text-lg max-w-md mx-auto">
                Track your favorite markets with a premium, multi-layer analysis dashboard.
              </p>
            </div>

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>

              <div className="relative flex items-center bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-2 focus-within:border-blue-500/50 transition-all shadow-2xl">
                <div className="pl-4 text-gray-500">
                  <FiSearch size={24} />
                </div>

                <input
                  type="text"
                  placeholder="Search Ticker (e.g. AAPL, BTC, EUR_USD)"
                  value={ticker}
                  onChange={handleInputChange}
                  onFocus={() => ticker.length >= 1 && suggestions.length > 0 && setShowSuggestions(true)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full bg-transparent px-4 py-4 text-xl outline-none placeholder:text-gray-600 font-medium tracking-wide"
                />

                <button
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-wait text-white px-8 py-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20 uppercase tracking-widest text-sm"
                >
                  {loading ? "Scanning..." : "Analyze"}
                </button>
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50">
                  {suggestions.map((item) => (
                    <div
                      key={item.symbol}
                      onClick={() => handleSelectSuggestion(item.symbol)}
                      className="flex items-center justify-between px-6 py-4 hover:bg-blue-900/40 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
                    >
                      <span className="font-bold text-blue-400 tracking-wider">{item.symbol}</span>
                      <span className="text-gray-400 text-sm truncate max-w-[220px]">
                        {item.description}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-900/30 border border-red-500/30 rounded-2xl text-red-400 text-center font-medium backdrop-blur-md">
                {error}
              </div>
            )}

            <div className="mt-12 flex justify-center items-center gap-8 text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                </span>
                NYSE
              </div>

              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                NASDAQ
              </div>

              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                CRYPTO
              </div>
            </div>
          </div>
        </main>

        {stockData && analysis && (
          <div
            ref={analysisRef}
            className="min-h-screen flex flex-col items-center justify-center p-6 relative z-10 pt-20 pb-32"
          >
            <div className="absolute top-0 w-full max-w-5xl h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            <div className="max-w-6xl w-full space-y-6">
              <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 bg-black/40 p-8 rounded-3xl border border-white/5 backdrop-blur-xl">
                <div className="flex items-start gap-6">
                  {companyData?.logo ? (
                    <img
                      src={companyData.logo}
                      alt="logo"
                      className="w-20 h-20 rounded-2xl shadow-xl bg-white p-1"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-3xl font-bold shadow-xl">
                      {cleanSymbol(ticker).charAt(0)}
                    </div>
                  )}

                  <div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
                      {companyData?.name || cleanSymbol(ticker)}
                    </h2>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-gray-400 font-medium text-sm">
                      <span className="uppercase tracking-widest text-blue-400 font-bold">{ticker}</span>

                      {companyData?.finnhubIndustry && (
                        <span className="flex items-center gap-1">
                          <FiGlobe /> {companyData.finnhubIndustry}
                        </span>
                      )}

                      <span className="flex items-center gap-1">
                        <FiLayers /> {analysis.assetType.toUpperCase()}
                      </span>

                      {companyData?.weburl && (
                        <a
                          href={companyData.weburl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-white transition-colors"
                        >
                          Website
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div
                    className={`px-6 py-4 rounded-2xl border backdrop-blur-md min-w-[220px] ${analysis.signal.bg} ${analysis.signal.border}`}
                  >
                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block mb-1">
                      Composite Signal
                    </span>

                    <div className="flex items-end gap-3">
                      <span className={`text-2xl font-black tracking-wider ${analysis.signal.color}`}>
                        {analysis.signal.text}
                      </span>
                      <span className="text-sm text-gray-300 font-bold">{analysis.score}/100</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                      <span>{analysis.trendBias}</span>
                      <span>{analysis.riskLevel} risk</span>
                    </div>
                  </div>

                  <div className="px-6 py-4 rounded-2xl border border-white/10 bg-white/[0.03] min-w-[220px]">
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block mb-1">
                      Live Read
                    </span>
                    <div className="text-xl font-black text-white">
                      {analysis.dayRangePos !== null ? `${analysis.dayRangePos.toFixed(0)}% day position` : "—"}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                      <span>{formatDateTime(stockData.t)}</span>
                      <span>{formatPercent(analysis.openGapPct)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-gradient-to-br from-black/80 to-[#0a0a0a] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none"></div>

                  <div className="flex justify-between items-start gap-6 mb-8 flex-col lg:flex-row">
                    <div>
                      <p className="flex items-center gap-2 text-gray-500 font-bold tracking-widest text-xs uppercase">
                        <FiActivity className="text-blue-500" /> Price Structure
                      </p>

                      <div className="flex flex-col md:flex-row md:items-end gap-6 mt-4">
                        <span className="text-6xl md:text-8xl font-black tracking-tighter">
                          {formatMoney(stockData.c)}
                        </span>

                        <div
                          className={`flex items-center text-2xl md:text-3xl font-bold mb-2 ${
                            stockData.d >= 0 ? "text-green-400" : "text-red-500"
                          }`}
                        >
                          {stockData.d >= 0 ? (
                            <FiArrowUp strokeWidth={3} />
                          ) : (
                            <FiArrowDown strokeWidth={3} />
                          )}
                          <span className="ml-1">{formatMoney(Math.abs(stockData.d))}</span>
                          <span className="ml-3 px-3 py-1 rounded-lg bg-current/10 text-lg backdrop-blur-sm">
                            {formatPercent(Math.abs(stockData.dp))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 min-w-[230px] w-full lg:w-auto">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">
                          Trend Bias
                        </p>
                        <p className="text-sm font-bold text-white mt-1">{analysis.trendBias}</p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">
                          Risk Profile
                        </p>
                        <p className="text-sm font-bold text-white mt-1">{analysis.riskLevel}</p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">
                          Last Update
                        </p>
                        <p className="text-sm font-bold text-white mt-1">{formatDateTime(stockData.t)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                    {analysis.sparklinePoints ? (
                      <svg viewBox="0 0 520 140" className="w-full h-36">
                        <defs>
                          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#2563eb" />
                            <stop offset="100%" stopColor="#22d3ee" />
                          </linearGradient>
                        </defs>
                        <polyline
                          fill="none"
                          stroke="url(#lineGradient)"
                          strokeWidth="4"
                          points={analysis.sparklinePoints}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <div className="h-36 flex items-center justify-center text-sm text-gray-500">
                        Not enough candle history to render trend line.
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.25em] text-gray-500 font-bold">
                          Intraday Position
                        </p>
                        <p className="text-sm font-semibold text-white">
                          {analysis.dayRangePos !== null ? `${analysis.dayRangePos.toFixed(1)}%` : "—"}
                        </p>
                      </div>

                      <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-white/5 relative">
                        <div
                          className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full"
                          style={{ width: `${analysis.dayRangePos ?? 0}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <span>Low {formatMoney(stockData.l)}</span>
                        <span>High {formatMoney(stockData.h)}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.25em] text-gray-500 font-bold">
                          52W Position
                        </p>
                        <p className="text-sm font-semibold text-white">
                          {analysis.week52Pos !== null ? `${analysis.week52Pos.toFixed(1)}%` : "—"}
                        </p>
                      </div>

                      <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-white/5 relative">
                        <div
                          className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-indigo-600 to-fuchsia-400 rounded-full"
                          style={{ width: `${analysis.week52Pos ?? 0}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <span>52W Low {formatMoney(analysis.week52Low)}</span>
                        <span>52W High {formatMoney(analysis.week52High)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                    <p className="flex items-center gap-2 text-gray-500 font-bold tracking-widest text-xs uppercase mb-4">
                      <FiCpu className="text-purple-500" /> Executive Summary
                    </p>

                    <p className="text-gray-300 text-sm leading-7 font-medium">{analysis.summary}</p>

                    <div className="grid grid-cols-2 gap-3 mt-5">
                      {[
                        { label: "Signal Score", value: `${analysis.score}/100` },
                        { label: "Risk", value: analysis.riskLevel },
                        {
                          label: "Day Range",
                          value: analysis.dayRangePos !== null ? `${analysis.dayRangePos.toFixed(0)}%` : "—",
                        },
                        { label: "Open Gap", value: formatPercent(analysis.openGapPct) },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                        >
                          <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold">
                            {item.label}
                          </p>
                          <p className="text-sm font-black text-white mt-2">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 font-bold tracking-widest text-[10px] uppercase mb-1">
                        Open
                      </p>
                      <p className="text-xl font-bold text-white">{formatMoney(stockData.o)}</p>
                    </div>

                    <div>
                      <p className="text-gray-600 font-bold tracking-widest text-[10px] uppercase mb-1">
                        Prev Close
                      </p>
                      <p className="text-xl font-bold text-white">{formatMoney(stockData.pc)}</p>
                    </div>

                    <div>
                      <p className="text-gray-600 font-bold tracking-widest text-[10px] uppercase mb-1">
                        Day Delta
                      </p>
                      <p className={`text-xl font-bold ${stockData.d >= 0 ? "text-green-400" : "text-red-500"}`}>
                        {stockData.d >= 0 ? "+" : "-"}
                        {formatMoney(Math.abs(stockData.d))}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-600 font-bold tracking-widest text-[10px] uppercase mb-1">
                        Updated
                      </p>
                      <p className="text-sm font-bold text-white">{formatDateTime(stockData.t)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                  <div className="flex items-center justify-between mb-6 gap-4">
                    <p className="flex items-center gap-2 text-gray-500 font-bold tracking-widest text-xs uppercase">
                      <FiBarChart2 className="text-blue-500" /> Momentum & Trend Stack
                    </p>

                    <span className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                      {analysis.trendBias}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[
                      {
                        label: "RSI (14)",
                        value: typeof analysis.rsi14 === "number" ? analysis.rsi14.toFixed(1) : "—",
                        hint:
                          typeof analysis.rsi14 === "number"
                            ? analysis.rsi14 > 70
                              ? "Overbought zone"
                              : analysis.rsi14 < 30
                              ? "Oversold zone"
                              : "Healthy / balanced"
                            : "Need more history",
                      },
                      {
                        label: "20D SMA",
                        value: formatMoney(analysis.sma20),
                        hint:
                          typeof analysis.sma20 === "number"
                            ? `${formatPercent(((stockData.c - analysis.sma20) / analysis.sma20) * 100)} vs spot`
                            : "Need more history",
                      },
                      {
                        label: "50D SMA",
                        value: formatMoney(analysis.sma50),
                        hint:
                          typeof analysis.sma50 === "number"
                            ? `${formatPercent(((stockData.c - analysis.sma50) / analysis.sma50) * 100)} vs spot`
                            : "Need more history",
                      },
                      {
                        label: "30D Volatility",
                        value: formatPercent(analysis.volatility30d),
                        hint: "Daily realized volatility",
                      },
                      {
                        label: "Volume Ratio",
                        value:
                          typeof analysis.volumeRatio === "number"
                            ? `${analysis.volumeRatio.toFixed(2)}x`
                            : "—",
                        hint: "Latest vs 20D average",
                      },
                      {
                        label: "52W Range",
                        value:
                          analysis.week52Pos !== null ? `${analysis.week52Pos.toFixed(1)}%` : "—",
                        hint: "Current placement in annual range",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">
                          {item.label}
                        </p>
                        <p className="text-2xl font-black text-white mt-2">{item.value}</p>
                        <p className="text-xs text-gray-500 mt-2">{item.hint}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                  <p className="flex items-center gap-2 text-gray-500 font-bold tracking-widest text-xs uppercase mb-6">
                    <FiTarget className="text-cyan-400" /> Tactical Map
                  </p>

                  <div className="space-y-4">
                    {[
                      {
                        label: "Support",
                        value: formatMoney(analysis.recentSupport),
                        color: "text-blue-400",
                      },
                      { label: "Pivot", value: formatMoney(analysis.pivot), color: "text-white" },
                      {
                        label: "Resistance",
                        value: formatMoney(analysis.recentResistance),
                        color: "text-fuchsia-400",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <span className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">
                          {item.label}
                        </span>
                        <span className={`text-lg font-black ${item.color}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                      Bull case: hold above {formatMoney(analysis.pivot)} and clear{" "}
                      {formatMoney(analysis.recentResistance)}.
                    </div>

                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
                      Weakness trigger: lose {formatMoney(analysis.recentSupport)} and fail to reclaim
                      the pivot.
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-gray-300">
                      This tactical layer is price-structure based, not financial advice.
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                  <p className="flex items-center gap-2 text-gray-500 font-bold tracking-widest text-xs uppercase mb-6">
                    <FiBriefcase className="text-amber-400" /> Fundamentals
                  </p>

                  {analysis.assetType === "stock" ? (
                    <div className="space-y-4">
                      {[
                        {
                          label: "P / E",
                          value:
                            typeof basicFinancials?.metric?.peBasicExclExtraTTM === "number"
                              ? basicFinancials.metric.peBasicExclExtraTTM.toFixed(2)
                              : "—",
                        },
                        {
                          label: "EPS",
                          value:
                            typeof basicFinancials?.metric?.epsBasicExclExtraItemsTTM === "number"
                              ? basicFinancials.metric.epsBasicExclExtraItemsTTM.toFixed(2)
                              : "—",
                        },
                        {
                          label: "Dividend Yield",
                          value: formatPercent(
                            basicFinancials?.metric?.dividendYieldIndicatedAnnual
                          ),
                        },
                        {
                          label: "Beta",
                          value:
                            typeof basicFinancials?.metric?.beta === "number"
                              ? basicFinancials.metric.beta.toFixed(2)
                              : "—",
                        },
                        {
                          label: "Current Ratio",
                          value:
                            typeof basicFinancials?.metric?.currentRatioQuarterly === "number"
                              ? basicFinancials.metric.currentRatioQuarterly.toFixed(2)
                              : "—",
                        },
                        {
                          label: "Debt / Equity",
                          value:
                            typeof basicFinancials?.metric?.totalDebtToEquityQuarterly === "number"
                              ? basicFinancials.metric.totalDebtToEquityQuarterly.toFixed(2)
                              : "—",
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                        >
                          <span className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">
                            {item.label}
                          </span>
                          <span className="text-base font-black text-white">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400">
                      Corporate fundamentals are generally not available for this asset class.
                    </div>
                  )}
                </div>

                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                  <p className="flex items-center gap-2 text-gray-500 font-bold tracking-widest text-xs uppercase mb-6">
                    <FiZap className="text-emerald-400" /> Analyst Consensus
                  </p>

                  {analysis.assetType === "stock" && analysis.latestRec ? (
                    <>
                      <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-gray-900 flex">
                        <div
                          className="bg-green-400/90"
                          style={{
                            width: `${
                              analysis.totalRec
                                ? (((analysis.latestRec.strongBuy ?? 0) / analysis.totalRec) * 100)
                                : 0
                            }%`,
                          }}
                        />
                        <div
                          className="bg-emerald-500/80"
                          style={{
                            width: `${
                              analysis.totalRec
                                ? (((analysis.latestRec.buy ?? 0) / analysis.totalRec) * 100)
                                : 0
                            }%`,
                          }}
                        />
                        <div
                          className="bg-gray-500/70"
                          style={{
                            width: `${
                              analysis.totalRec
                                ? (((analysis.latestRec.hold ?? 0) / analysis.totalRec) * 100)
                                : 0
                            }%`,
                          }}
                        />
                        <div
                          className="bg-rose-500/80"
                          style={{
                            width: `${
                              analysis.totalRec
                                ? (((analysis.latestRec.sell ?? 0) / analysis.totalRec) * 100)
                                : 0
                            }%`,
                          }}
                        />
                        <div
                          className="bg-red-500/90"
                          style={{
                            width: `${
                              analysis.totalRec
                                ? (((analysis.latestRec.strongSell ?? 0) / analysis.totalRec) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-5 gap-2 mt-4">
                        {[
                          { label: "SB", value: analysis.latestRec.strongBuy ?? 0 },
                          { label: "B", value: analysis.latestRec.buy ?? 0 },
                          { label: "H", value: analysis.latestRec.hold ?? 0 },
                          { label: "S", value: analysis.latestRec.sell ?? 0 },
                          { label: "SS", value: analysis.latestRec.strongSell ?? 0 },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center"
                          >
                            <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold">
                              {item.label}
                            </p>
                            <p className="text-lg font-black text-white mt-1">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-sm text-gray-300 leading-6">
                          Latest period:{" "}
                          <span className="font-bold text-white">{analysis.latestRec.period}</span>
                          <br />
                          Bullish share:{" "}
                          <span className="font-bold text-emerald-400">
                            {formatPercent(analysis.bullishPct)}
                          </span>
                          <br />
                          Bearish share:{" "}
                          <span className="font-bold text-rose-400">
                            {formatPercent(analysis.bearishPct)}
                          </span>
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400">
                      No analyst consensus data available for this symbol / asset class.
                    </div>
                  )}
                </div>

                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                  <p className="flex items-center gap-2 text-gray-500 font-bold tracking-widest text-xs uppercase mb-6">
                    <FiShield className="text-sky-400" /> Market Snapshot
                  </p>

                  <div className="space-y-4">
                    {[
                      { label: "Exchange", value: companyData?.exchange || "—" },
                      { label: "Country", value: companyData?.country || "—" },
                      { label: "Currency", value: companyData?.currency || "—" },
                      { label: "Industry", value: companyData?.finnhubIndustry || "—" },
                      { label: "IPO", value: companyData?.ipo || "—" },
                      { label: "Last Update", value: formatDateTime(stockData.t) },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <span className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold">
                          {item.label}
                        </span>
                        <span className="text-sm font-black text-white text-right max-w-[55%] truncate">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold">
                        Volume
                      </p>
                      <p className="text-lg font-black text-white mt-2">
                        {formatCompact(analysis.latestVolume)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold">
                        Avg 20D
                      </p>
                      <p className="text-lg font-black text-white mt-2">
                        {formatCompact(analysis.avg20Volume)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}