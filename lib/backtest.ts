// Lightweight backtesting engine running on OHLC daily candles.

export type Candle = {
  t: number; // epoch seconds
  o: number;
  h: number;
  l: number;
  c: number;
};

export type Strategy = "rsi" | "sma_cross" | "macd" | "buy_hold";

export type Trade = {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  pnlPct: number;
};

export type BacktestResult = {
  strategy: Strategy;
  equityCurve: { time: number; value: number }[];
  buyHoldCurve: { time: number; value: number }[];
  totalReturn: number;
  buyHoldReturn: number;
  trades: Trade[];
  winRate: number;
  sharpe: number;
  maxDrawdown: number;
};

// ---------------- Indicators ----------------

function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    out.push(sum / period);
  }
  return out;
}

function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (prev == null) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += values[j];
      prev = sum / period;
    } else {
      prev = values[i] * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = [null];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
        const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
        out.push(100 - 100 / (1 + rs));
      } else {
        out.push(null);
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
      out.push(100 - 100 / (1 + rs));
    }
  }
  return out;
}

// ---------------- Backtest runner ----------------

type Signal = "buy" | "sell" | "hold";

function computeSignals(candles: Candle[], strategy: Strategy): Signal[] {
  const closes = candles.map((c) => c.c);

  if (strategy === "buy_hold") {
    return candles.map((_, i) => (i === 0 ? "buy" : "hold"));
  }

  if (strategy === "rsi") {
    const r = rsi(closes, 14);
    return r.map((v) => {
      if (v == null) return "hold";
      if (v < 30) return "buy";
      if (v > 70) return "sell";
      return "hold";
    });
  }

  if (strategy === "sma_cross") {
    const fast = sma(closes, 20);
    const slow = sma(closes, 50);
    const out: Signal[] = [];
    for (let i = 0; i < closes.length; i++) {
      const f = fast[i];
      const s = slow[i];
      const fPrev = i > 0 ? fast[i - 1] : null;
      const sPrev = i > 0 ? slow[i - 1] : null;
      if (f == null || s == null || fPrev == null || sPrev == null) {
        out.push("hold");
        continue;
      }
      if (fPrev <= sPrev && f > s) out.push("buy");
      else if (fPrev >= sPrev && f < s) out.push("sell");
      else out.push("hold");
    }
    return out;
  }

  if (strategy === "macd") {
    const fast = ema(closes, 12);
    const slow = ema(closes, 26);
    const macdLine = closes.map((_, i) => {
      const f = fast[i];
      const s = slow[i];
      return f != null && s != null ? f - s : null;
    });
    // Signal line: 9-period EMA of macdLine (ignoring nulls by filtering)
    const validMacd: number[] = macdLine.map((v) => v ?? 0);
    const signal = ema(validMacd, 9);

    const out: Signal[] = [];
    for (let i = 0; i < closes.length; i++) {
      const m = macdLine[i];
      const s = signal[i];
      const mPrev = i > 0 ? macdLine[i - 1] : null;
      const sPrev = i > 0 ? signal[i - 1] : null;
      if (m == null || s == null || mPrev == null || sPrev == null) {
        out.push("hold");
        continue;
      }
      if (mPrev <= sPrev && m > s) out.push("buy");
      else if (mPrev >= sPrev && m < s) out.push("sell");
      else out.push("hold");
    }
    return out;
  }

  return candles.map(() => "hold");
}

export function runBacktest(candles: Candle[], strategy: Strategy, initialCapital = 10_000): BacktestResult {
  if (candles.length < 2) {
    return {
      strategy,
      equityCurve: [],
      buyHoldCurve: [],
      totalReturn: 0,
      buyHoldReturn: 0,
      trades: [],
      winRate: 0,
      sharpe: 0,
      maxDrawdown: 0,
    };
  }

  const signals = computeSignals(candles, strategy);

  let cash = initialCapital;
  let shares = 0;
  let entryPrice = 0;
  let entryTime = 0;

  const equityCurve: { time: number; value: number }[] = [];
  const trades: Trade[] = [];

  for (let i = 0; i < candles.length; i++) {
    const { t, c } = candles[i];
    const sig = signals[i];

    if (sig === "buy" && shares === 0) {
      shares = cash / c;
      cash = 0;
      entryPrice = c;
      entryTime = t;
    } else if (sig === "sell" && shares > 0) {
      cash = shares * c;
      trades.push({
        entryTime,
        exitTime: t,
        entryPrice,
        exitPrice: c,
        pnlPct: ((c - entryPrice) / entryPrice) * 100,
      });
      shares = 0;
    }

    const equity = cash + shares * c;
    equityCurve.push({ time: t, value: equity });
  }

  // Close any open position at the end
  if (shares > 0) {
    const last = candles[candles.length - 1];
    trades.push({
      entryTime,
      exitTime: last.t,
      entryPrice,
      exitPrice: last.c,
      pnlPct: ((last.c - entryPrice) / entryPrice) * 100,
    });
  }

  // Buy-and-hold baseline
  const bhShares = initialCapital / candles[0].c;
  const buyHoldCurve = candles.map((cd) => ({ time: cd.t, value: bhShares * cd.c }));

  const totalReturn = ((equityCurve[equityCurve.length - 1].value - initialCapital) / initialCapital) * 100;
  const buyHoldReturn =
    ((buyHoldCurve[buyHoldCurve.length - 1].value - initialCapital) / initialCapital) * 100;

  // Sharpe + max drawdown from equity curve
  const values = equityCurve.map((p) => p.value);
  const returns: number[] = [];
  for (let i = 1; i < values.length; i++) {
    returns.push((values[i] - values[i - 1]) / values[i - 1]);
  }
  const mean = returns.reduce((s, r) => s + r, 0) / (returns.length || 1);
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length || 1);
  const stdev = Math.sqrt(variance);
  const sharpe = stdev > 0 ? (mean / stdev) * Math.sqrt(252) : 0;

  let peak = values[0];
  let maxDD = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  const wins = trades.filter((t) => t.pnlPct > 0).length;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

  return {
    strategy,
    equityCurve,
    buyHoldCurve,
    totalReturn,
    buyHoldReturn,
    trades,
    winRate,
    sharpe,
    maxDrawdown: -maxDD * 100,
  };
}
