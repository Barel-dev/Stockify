import { runBacktest, type Candle } from "@/lib/backtest";

function makeCandles(closes: number[], startTime = 1000000): Candle[] {
  return closes.map((c, i) => ({
    t: startTime + i * 86400,
    o: c - 1,
    h: c + 1,
    l: c - 2,
    c,
  }));
}

describe("runBacktest", () => {
  it("returns empty result for fewer than 2 candles", () => {
    const result = runBacktest([], "buy_hold");
    expect(result.equityCurve).toEqual([]);
    expect(result.trades).toEqual([]);
    expect(result.totalReturn).toBe(0);
  });

  it("returns empty result for a single candle", () => {
    const result = runBacktest(makeCandles([100]), "rsi");
    expect(result.equityCurve).toEqual([]);
    expect(result.totalReturn).toBe(0);
  });

  describe("buy_hold strategy", () => {
    it("buys on day 1 and holds to end", () => {
      const candles = makeCandles([100, 110, 120]);
      const result = runBacktest(candles, "buy_hold", 10_000);
      expect(result.strategy).toBe("buy_hold");
      expect(result.totalReturn).toBeCloseTo(20, 0);
      expect(result.trades.length).toBe(1);
    });

    it("tracks negative returns", () => {
      const candles = makeCandles([100, 90, 80]);
      const result = runBacktest(candles, "buy_hold", 10_000);
      expect(result.totalReturn).toBeCloseTo(-20, 0);
    });

    it("buy_hold and buyHoldReturn are equal", () => {
      const candles = makeCandles([50, 60, 70, 80]);
      const result = runBacktest(candles, "buy_hold", 10_000);
      expect(result.totalReturn).toBeCloseTo(result.buyHoldReturn, 1);
    });
  });

  describe("equity curve", () => {
    it("has same length as input candles", () => {
      const candles = makeCandles([100, 105, 110, 108, 115]);
      const result = runBacktest(candles, "buy_hold");
      expect(result.equityCurve.length).toBe(candles.length);
      expect(result.buyHoldCurve.length).toBe(candles.length);
    });

    it("equity curve starts at initial capital", () => {
      const candles = makeCandles([100, 105, 110]);
      const result = runBacktest(candles, "buy_hold", 5000);
      expect(result.equityCurve[0].value).toBe(5000);
    });
  });

  describe("statistics", () => {
    it("computes sharpe ratio", () => {
      const candles = makeCandles([100, 102, 104, 103, 106, 108, 110]);
      const result = runBacktest(candles, "buy_hold");
      expect(typeof result.sharpe).toBe("number");
      expect(Number.isFinite(result.sharpe)).toBe(true);
    });

    it("computes max drawdown as negative percentage", () => {
      const candles = makeCandles([100, 110, 90, 95, 100]);
      const result = runBacktest(candles, "buy_hold");
      expect(result.maxDrawdown).toBeLessThanOrEqual(0);
    });

    it("computes win rate for strategies with trades", () => {
      const candles = makeCandles([100, 105, 110, 108, 115]);
      const result = runBacktest(candles, "buy_hold");
      expect(result.winRate).toBeGreaterThanOrEqual(0);
      expect(result.winRate).toBeLessThanOrEqual(100);
    });
  });

  describe("RSI strategy", () => {
    it("returns valid result with enough data", () => {
      // RSI needs 14+ periods to generate signals
      const closes = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i * 0.5) * 20);
      const candles = makeCandles(closes);
      const result = runBacktest(candles, "rsi");
      expect(result.strategy).toBe("rsi");
      expect(result.equityCurve.length).toBe(30);
    });
  });

  describe("SMA cross strategy", () => {
    it("returns valid result with enough data", () => {
      // SMA cross needs 50+ periods for the slow SMA
      const closes = Array.from({ length: 60 }, (_, i) => 100 + i * 0.5);
      const candles = makeCandles(closes);
      const result = runBacktest(candles, "sma_cross");
      expect(result.strategy).toBe("sma_cross");
      expect(result.equityCurve.length).toBe(60);
    });
  });

  describe("MACD strategy", () => {
    it("returns valid result with enough data", () => {
      // MACD needs 26+ periods for slow EMA + 9 for signal
      const closes = Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i * 0.3) * 15);
      const candles = makeCandles(closes);
      const result = runBacktest(candles, "macd");
      expect(result.strategy).toBe("macd");
      expect(result.equityCurve.length).toBe(40);
    });
  });

  describe("custom initial capital", () => {
    it("uses provided capital", () => {
      const candles = makeCandles([100, 200]);
      const result = runBacktest(candles, "buy_hold", 50_000);
      const finalEquity = result.equityCurve[result.equityCurve.length - 1].value;
      expect(finalEquity).toBeCloseTo(100_000, 0);
    });
  });

  describe("EMA cross strategy", () => {
    it("returns valid result with enough data", () => {
      const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i * 0.2) * 10 + i * 0.3);
      const result = runBacktest(makeCandles(closes), "ema_cross");
      expect(result.strategy).toBe("ema_cross");
      expect(result.equityCurve.length).toBe(60);
    });
  });

  describe("Bollinger strategy", () => {
    it("returns valid result with enough data", () => {
      const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i * 0.7) * 12);
      const result = runBacktest(makeCandles(closes), "bollinger");
      expect(result.strategy).toBe("bollinger");
      expect(result.equityCurve.length).toBe(60);
    });
  });

  describe("stop-loss", () => {
    it("exits at the stop price when the low breaches it intraday", () => {
      // Buy day 1 at 100. Day 2 opens at 95.5 (close - 1, above the 95 stop)
      // and its low of 94.5 (close - 2) breaches it → fill at exactly 95.
      const candles = makeCandles([100, 96.5, 96.5]);
      const result = runBacktest(candles, "buy_hold", 10_000, { stopLossPct: 5 });
      expect(result.trades.length).toBe(1);
      expect(result.trades[0].exitReason).toBe("stop");
      expect(result.trades[0].exitPrice).toBeCloseTo(95, 5);
      expect(result.totalReturn).toBeCloseTo(-5, 1);
    });

    it("fills at the open when price gaps through the stop", () => {
      // Day 2 open = 79 (close - 1), below the 95 stop → fill at the open.
      const candles = makeCandles([100, 80, 80]);
      const result = runBacktest(candles, "buy_hold", 10_000, { stopLossPct: 5 });
      expect(result.trades[0].exitReason).toBe("stop");
      expect(result.trades[0].exitPrice).toBeCloseTo(79, 5);
    });
  });

  describe("take-profit", () => {
    it("exits at the target when the high reaches it", () => {
      // Buy at 100; day 2 high = 111 (close + 1) ≥ 10% target (110) → fill at 110.
      const candles = makeCandles([100, 110, 110]);
      const result = runBacktest(candles, "buy_hold", 10_000, { takeProfitPct: 10 });
      expect(result.trades.length).toBe(1);
      expect(result.trades[0].exitReason).toBe("target");
      expect(result.trades[0].exitPrice).toBeCloseTo(110, 5);
      expect(result.totalReturn).toBeCloseTo(10, 1);
    });
  });

  describe("position sizing", () => {
    it("deploys only the requested fraction of capital", () => {
      // 50% sizing on a double: half the cash doubles → +50% total.
      const candles = makeCandles([100, 200]);
      const result = runBacktest(candles, "buy_hold", 10_000, { positionPct: 50 });
      const finalEquity = result.equityCurve[result.equityCurve.length - 1].value;
      expect(finalEquity).toBeCloseTo(15_000, 0);
    });
  });

  describe("backward compatibility", () => {
    it("no options behaves like full-size, no-stop run", () => {
      const candles = makeCandles([100, 110, 120]);
      const withDefaults = runBacktest(candles, "buy_hold", 10_000);
      const withEmpty = runBacktest(candles, "buy_hold", 10_000, {});
      expect(withDefaults.totalReturn).toBeCloseTo(withEmpty.totalReturn, 6);
    });
  });
});
