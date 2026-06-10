"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type LivePrice = {
  price: number;
  volume: number;
  timestamp: number;
};

type TradeMessage = {
  type: string;
  data?: { s: string; p: number; v: number; t: number }[];
};

/**
 * Hook that connects to Finnhub WebSocket API for real-time price updates.
 * Reconnects with capped exponential backoff if the socket drops.
 * @param symbols - Array of stock symbols to subscribe to
 * @param apiKey - Finnhub API key (passed from env via component)
 */
export function useLivePrices(symbols: string[], apiKey: string) {
  const [prices, setPrices] = useState<Map<string, LivePrice>>(new Map());
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const subscribedRef = useRef<Set<string>>(new Set());

  const subscribe = useCallback((ws: WebSocket, symbol: string) => {
    if (ws.readyState === WebSocket.OPEN && !subscribedRef.current.has(symbol)) {
      ws.send(JSON.stringify({ type: "subscribe", symbol }));
      subscribedRef.current.add(symbol);
    }
  }, []);

  // Key the effect on the joined string so a new array with the same symbols
  // doesn't tear down a healthy connection.
  const symbolsKey = symbols.join(",");

  useEffect(() => {
    if (!apiKey || symbolsKey === "") return;

    const syms = symbolsKey.split(",").filter(Boolean);
    const subscribed = subscribedRef.current;
    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const connect = () => {
      if (disposed) return;

      const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
      wsRef.current = ws;

      ws.onopen = () => {
        attempts = 0;
        setConnected(true);
        for (const symbol of syms) {
          subscribe(ws, symbol);
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg: TradeMessage = JSON.parse(event.data);
          if (msg.type === "trade" && msg.data) {
            setPrices((prev) => {
              const next = new Map(prev);
              for (const trade of msg.data!) {
                next.set(trade.s, {
                  price: trade.p,
                  volume: trade.v,
                  timestamp: trade.t,
                });
              }
              return next;
            });
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setConnected(false);
        subscribed.clear();
        // Reconnect unless this close came from effect cleanup.
        if (!disposed && attempts < 6) {
          attempts++;
          retryTimer = setTimeout(connect, Math.min(30_000, 1_000 * 2 ** attempts));
        }
      };

      ws.onerror = () => {
        setConnected(false);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
      subscribed.clear();
    };
  }, [apiKey, symbolsKey, subscribe]);

  return { prices, connected };
}
