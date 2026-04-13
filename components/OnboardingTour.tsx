"use client";

import { useState, useEffect } from "react";
import { FiX, FiChevronRight, FiSearch, FiBarChart2, FiStar, FiBriefcase, FiGrid, FiCalendar } from "react-icons/fi";

const TOUR_STEPS = [
  {
    title: "Welcome to Stockify",
    description: "Your all-in-one market intelligence dashboard. Search any stock, crypto, or forex pair to get started.",
    icon: FiSearch,
  },
  {
    title: "Compare Tickers",
    description: "Side-by-side comparison of any two assets — complete with performance charts and analyst data.",
    icon: FiBarChart2,
  },
  {
    title: "Build Your Watchlist",
    description: "Save tickers to your watchlist for live price tracking. Drag and drop to reorder them.",
    icon: FiStar,
  },
  {
    title: "Track Your Portfolio",
    description: "Add your holdings with buy price and shares to see real-time P&L, allocation charts, and performance.",
    icon: FiBriefcase,
  },
  {
    title: "Market Heatmap",
    description: "Visual overview of S&P 500 sectors with color-coded performance tiles.",
    icon: FiGrid,
  },
  {
    title: "Earnings Calendar",
    description: "Stay ahead with upcoming earnings reports, EPS estimates, and beat/miss history.",
    icon: FiCalendar,
  },
];

const STORAGE_KEY = "stockify-tour-completed";

export default function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const next = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const current = TOUR_STEPS[step];
  const Icon = current.icon;
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismiss} />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0a0a] backdrop-blur-2xl p-8 shadow-2xl">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 rounded-full p-2 text-gray-500 hover:text-white hover:bg-white/10 transition-all"
        >
          <FiX size={16} />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-5">
          <Icon className="text-blue-400" size={24} />
        </div>

        {/* Content */}
        <h2 className="text-xl font-black text-white mb-2">{current.title}</h2>
        <p className="text-sm text-gray-400 leading-relaxed mb-6">{current.description}</p>

        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-5">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i <= step ? "bg-blue-500 w-6" : "bg-white/10 w-3"
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={dismiss}
            className="text-xs font-bold text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-wider"
          >
            Skip Tour
          </button>
          <button
            onClick={next}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white transition-all shadow-lg shadow-blue-600/20"
          >
            {isLast ? "Get Started" : "Next"}
            {!isLast && <FiChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
