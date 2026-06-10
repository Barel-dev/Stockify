"use client";

import { useState, useRef, useEffect } from "react";
import { FiZap, FiLoader, FiRefreshCw } from "react-icons/fi";
import { renderMarkdown } from "@/components/SimpleMarkdown";

type Props = { from: string; to: string };

/**
 * Streams a Claude preview of the selected earnings week. Mount with
 * key={from} so state resets when the user navigates between weeks.
 */
export default function EarningsPreview({ from, to }: Props) {
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const checkedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Reuse the analyze config probe to hide the panel when AI isn't configured.
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    fetch("/api/analyze")
      .then((res) => res.json())
      .then((data) => {
        if (!data?.configured) setHidden(true);
      })
      .catch(() => {});
  }, []);

  const run = async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setPreview("");
    setError(null);
    setLoading(true);
    setStarted(true);

    try {
      const res = await fetch("/api/analyze-earnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
        signal: ac.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        if (res.status === 503) {
          setHidden(true);
          setLoading(false);
          return;
        }
        setError(data.error ?? `Request failed (${res.status})`);
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("No response body");
        setLoading(false);
        return;
      }
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setPreview(acc);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message ?? "Unknown error");
      }
    } finally {
      setLoading(false);
    }
  };

  if (hidden) return null;

  return (
    <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.06] via-black/40 to-blue-500/[0.06] backdrop-blur-xl p-6 mb-8">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30 p-2">
            <FiZap className="text-violet-400" size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">AI Week Preview</h3>
            <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold">The reports that matter · Claude</p>
          </div>
        </div>
        {started && !loading && (
          <button
            onClick={run}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-white hover:border-violet-500/30 transition-all inline-flex items-center gap-1.5"
          >
            <FiRefreshCw size={11} /> Regenerate
          </button>
        )}
      </div>

      {!started && (
        <button
          onClick={run}
          className="w-full rounded-2xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/15 hover:border-violet-500/50 transition-all py-4 text-sm font-bold text-violet-300 uppercase tracking-widest inline-flex items-center justify-center gap-2"
        >
          <FiZap size={14} /> Preview This Week
        </button>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-300">{error}</div>
      )}

      {started && !error && (
        <div className="space-y-2">
          {renderMarkdown(preview)}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
              <FiLoader className="animate-spin" size={12} />
              <span>Reading the slate...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
