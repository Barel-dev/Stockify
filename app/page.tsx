"use client";

import { useState } from "react";
import { FiSearch, FiTrendingUp } from "react-icons/fi";

export default function Home() {
  const [ticker, setTicker] = useState("");

  const handleSearch = () => {
    if (!ticker) return;
    alert(`Analyzing ${ticker} market dynamics...`);
  };

  return (
    <main className="min-h-screen bg-[#020203] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* --- ANIMATED BACKGROUND EFFECTS --- */}
      <style jsx>{`
        @keyframes float {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: float 7s infinite alternate ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>

      {/* Blobs - העיגולים המונפשים */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] animate-blob pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-blob animation-delay-2000 pointer-events-none"></div>
      <div className="absolute top-[20%] right-[20%] w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px] animate-blob animation-delay-4000 pointer-events-none"></div>

      {/* Grid Overlay - נותן טקסטורה של הייטק לרקע */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none"></div>

      <div className="max-w-2xl w-full z-10">
        <div className="text-center space-y-4 mb-12">
          {/* Animated Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wider uppercase animate-pulse">
            <FiTrendingUp /> Live Market Access
          </div>
          
          <h1 className="text-8xl font-black tracking-tighter bg-gradient-to-b from-white via-white to-gray-500 bg-clip-text text-transparent drop-shadow-2xl">
            STOCKIFY
          </h1>
          <p className="text-gray-400 text-xl max-w-md mx-auto font-light">
            Institutional-grade data for the modern trader.
          </p>
        </div>

        {/* --- SEARCH BAR --- */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          
          <div className="relative flex items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-2 focus-within:border-blue-500/50 transition-all">
            <div className="pl-6 text-gray-500">
              <FiSearch size={24} />
            </div>
            
            <input
              type="text"
              placeholder="Enter Symbol (e.g. NVDA)"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="w-full bg-transparent px-4 py-5 text-2xl outline-none placeholder:text-gray-700 font-medium tracking-widest"
            />
            
            <button
              onClick={handleSearch}
              className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-xl font-black transition-all active:scale-95 hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] uppercase tracking-tight"
            >
              Analyze
            </button>
          </div>
        </div>

        {/* --- FOOTER STATS --- */}
        <div className="mt-12 flex justify-center items-center gap-8 text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">
          <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span> NYSE</div>
          <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping shadow-[0_0_5px_green]"></span> NASDAQ</div>
          <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> CRYPTO</div>
        </div>
      </div>
    </main>
  );
}