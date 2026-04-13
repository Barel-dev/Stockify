"use client";

export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded bg-white/[0.06] ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-6">
      <SkeletonLine className="h-5 w-24 mb-3" />
      <SkeletonLine className="h-3 w-40 mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} className={`h-4 mb-2 ${i === lines - 1 ? "w-3/4" : "w-full"}`} />
      ))}
    </div>
  );
}

export function SkeletonMetricCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-5">
      <SkeletonLine className="h-3 w-20 mb-3" />
      <SkeletonLine className="h-7 w-28" />
    </div>
  );
}

export function SkeletonTable({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-5">
          <div className="flex items-center gap-4">
            <SkeletonLine className="h-5 w-20" />
            <SkeletonLine className="h-4 w-32" />
            <div className="flex-1" />
            <SkeletonLine className="h-6 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
