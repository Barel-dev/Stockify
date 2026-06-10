"use client";

import { useEffect, useState } from "react";
import { FiUsers } from "react-icons/fi";

type InsiderTransaction = {
  name?: string;
  share?: number;
  change?: number;
  filingDate?: string;
  transactionDate?: string;
  transactionCode?: string;
  transactionPrice?: number;
};

type Props = { symbol: string };

// SEC Form 4 transaction codes worth distinguishing in the UI.
const CODE_LABELS: Record<string, { label: string; tone: "buy" | "sell" | "neutral" }> = {
  P: { label: "Buy", tone: "buy" },
  S: { label: "Sell", tone: "sell" },
  M: { label: "Option Exercise", tone: "neutral" },
  A: { label: "Award", tone: "neutral" },
  F: { label: "Tax Withholding", tone: "neutral" },
  G: { label: "Gift", tone: "neutral" },
};

function classify(tx: InsiderTransaction): { label: string; tone: "buy" | "sell" | "neutral" } {
  const known = tx.transactionCode ? CODE_LABELS[tx.transactionCode] : undefined;
  if (known) return known;
  if (typeof tx.change === "number" && tx.change > 0) return { label: "Acquired", tone: "buy" };
  if (typeof tx.change === "number" && tx.change < 0) return { label: "Disposed", tone: "sell" };
  return { label: tx.transactionCode ?? "Other", tone: "neutral" };
}

function formatShares(n?: number): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

const TONE_CLASSES: Record<"buy" | "sell" | "neutral", string> = {
  buy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  sell: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  neutral: "border-white/10 bg-white/[0.05] text-gray-400",
};

export default function InsiderTransactions({ symbol }: Props) {
  const [transactions, setTransactions] = useState<InsiderTransaction[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setTransactions([]);

    fetch(`/api/insider?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { data?: InsiderTransaction[] } | null) => {
        if (cancelled) return;
        const rows = (data?.data ?? [])
          .filter((t) => t.transactionDate && typeof t.change === "number" && t.change !== 0)
          .sort((a, b) => (b.transactionDate ?? "").localeCompare(a.transactionDate ?? ""))
          .slice(0, 8);
        setTransactions(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // Hide entirely for symbols with no insider data (crypto, forex, foreign listings).
  if (!loaded || transactions.length === 0) return null;

  return (
    <div className="min-w-0 rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl transition-all duration-300 hover:border-white/20">
      <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-gray-500 font-bold mb-2">
        <FiUsers className="text-violet-400" />
        <span>Insider Transactions</span>
      </p>
      <p className="text-sm text-gray-400 leading-6 mb-5">
        SEC Form 4 filings from the last 6 months. Open-market buys are the signal worth watching.
      </p>

      <div className="space-y-2">
        {transactions.map((tx, i) => {
          const kind = classify(tx);
          const value =
            typeof tx.transactionPrice === "number" && typeof tx.change === "number" && tx.transactionPrice > 0
              ? Math.abs(tx.change) * tx.transactionPrice
              : null;
          return (
            <div
              key={`${tx.name}-${tx.transactionDate}-${i}`}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{tx.name ?? "Unknown insider"}</p>
                <p className="text-[10px] text-gray-500">{tx.transactionDate}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`text-sm font-bold ${kind.tone === "buy" ? "text-emerald-400" : kind.tone === "sell" ? "text-rose-400" : "text-gray-300"}`}>
                    {tx.change != null && tx.change > 0 ? "+" : ""}
                    {formatShares(tx.change)} shares
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {typeof tx.transactionPrice === "number" && tx.transactionPrice > 0
                      ? `@ $${tx.transactionPrice.toFixed(2)}${value ? ` · $${formatShares(value)}` : ""}`
                      : "price n/a"}
                  </p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${TONE_CLASSES[kind.tone]}`}>
                  {kind.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
