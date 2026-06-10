"use client";

import { useEffect, useState } from "react";
import { FiClock } from "react-icons/fi";

type Transaction = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  shares: number;
  price: number;
  realized_pnl: number | null;
  created_at: string;
};

/**
 * Recent buys/sells with realized P/L. Hides itself until the transactions
 * table exists and has rows (see README for the SQL).
 */
export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/transactions")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { available?: boolean; transactions?: Transaction[] } | null) => {
        if (data?.available && data.transactions) setTransactions(data.transactions);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || transactions.length === 0) return null;

  const totalRealized = transactions
    .filter((t) => t.side === "sell" && t.realized_pnl != null)
    .reduce((s, t) => s + (t.realized_pnl ?? 0), 0);
  const hasSells = transactions.some((t) => t.side === "sell");

  return (
    <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl mt-8">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-bold flex items-center gap-1.5">
          <FiClock size={12} /> Transaction History
        </p>
        {hasSells && (
          <p className="text-xs font-bold text-gray-400">
            Realized P&L:{" "}
            <span className={totalRealized >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {totalRealized >= 0 ? "+" : "-"}${Math.abs(totalRealized).toFixed(2)}
            </span>
          </p>
        )}
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {transactions.map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                  t.side === "buy"
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                }`}
              >
                {t.side}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-white">{t.symbol}</p>
                <p className="text-[10px] text-gray-500">
                  {new Date(t.created_at).toLocaleDateString()} · {t.shares} shares @ ${t.price.toFixed(2)}
                </p>
              </div>
            </div>
            {t.side === "sell" && t.realized_pnl != null && (
              <p className={`text-sm font-black ${t.realized_pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {t.realized_pnl >= 0 ? "+" : "-"}${Math.abs(t.realized_pnl).toFixed(2)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
