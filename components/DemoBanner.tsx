"use client";

import { SignInButton } from "@clerk/nextjs";
import { FiEye } from "react-icons/fi";

export default function DemoBanner({ thing }: { thing: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-blue-500/10 px-5 py-4 backdrop-blur-xl">
      <div className="flex items-center gap-3 min-w-0">
        <FiEye className="text-violet-300 shrink-0" />
        <p className="text-sm text-gray-200">
          <span className="font-black text-violet-300">Demo {thing}</span> with live market data — sign in to build your own.
        </p>
      </div>
      <SignInButton mode="modal">
        <button className="rounded-full border border-violet-400/40 bg-violet-500/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-violet-200 hover:bg-violet-500/25 transition-all">
          Sign In Free
        </button>
      </SignInButton>
    </div>
  );
}
