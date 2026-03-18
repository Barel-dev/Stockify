"use client";

import { useState, useRef } from "react";
import { FiSearch, FiTrendingUp, FiArrowUp, FiArrowDown } from "react-icons/fi";

export default function Home() {
  const [ticker, setTicker] = useState("");
  
  // State חדש לשמירת הנתונים שמגיעים מה-API
  const [stockData, setStockData] = useState<{ price: number; change: number; percent: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const glowRef = useRef<HTMLDivElement>(null);
  const trail1Ref = useRef<HTMLDivElement>(null);
  const trail2Ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const x = e.clientX;
    const y = e.clientY;
    if (glowRef.current) glowRef.current.style.transform = `translate(${x - 150}px, ${y - 150}px)`;
    if (trail1Ref.current) trail1Ref.current.style.transform = `translate(${x - 60}px, ${y - 60}px)`;
    if (trail2Ref.current) trail2Ref.current.style.transform = `translate(${x - 30}px, ${y - 30}px)`;
  };

  // הפונקציה שפונה ל-API בזמן אמת
  const handleSearch = async () => {
    if (!ticker) return;
    
    // מאפסים שגיאות ונתונים קודמים, ומפעילים מצב טעינה
    setLoading(true);
    setError("");
    setStockData(null);

    try {
      // קריאה לשרת של Finnhub עם המפתח שלך!
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=d6t63tpr01qoqoisd0p0d6t63tpr01qoqoisd0pg`);
      const data = await res.json();

      // Finnhub מחזיר 0 במחיר אם המניה לא קיימת
      if (data.c === 0) {
        setError(`לא מצאנו נתונים עבור ${ticker}. ודא שהסמל נכון.`);
      } else {
        // שומרים את הנתונים שהגיעו (c = current price, d = change, dp = percent change)
        setStockData({
          price: data.c,
          change: data.d,
          percent: data.dp,
        });
      }
    } catch (err) {
      setError("שגיאת תקשורת. נסה שוב.");
    } finally {
      // מכבים את מצב הטעינה
      setLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes superFloat {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(100px, -100px) scale(1.3); }
          66% { transform: translate(-100px, 100px) scale(0.7); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .force-animate-blob {
          animation: superFloat 4s infinite alternate ease-in-out;
        }
        .force-delay {
          animation-delay: 2s;
        }
      `}} />

      <main 
        onMouseMove={handleMouseMove}
        className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans"
      >
        {/* --- CURSOR TRAIL EFFECT --- */}
        <div ref={glowRef} className="pointer-events-none fixed top-0 left-0 z-0 h-[300px] w-[300px] rounded-full bg-gradient-to-r from-blue-600/20 to-indigo-600/20 blur-[80px] transition-transform duration-75 ease-out" style={{ transform: 'translate(-500px, -500px)' }}></div>
        <div ref={trail1Ref} className="pointer-events-none fixed top-0 left-0 z-0 h-[120px] w-[120px] rounded-full bg-blue-500/30 blur-[50px] transition-transform duration-300 ease-out" style={{ transform: 'translate(-500px, -500px)' }}></div>
        <div ref={trail2Ref} className="pointer-events-none fixed top-0 left-0 z-0 h-[60px] w-[60px] rounded-full bg-indigo-500/40 blur-[30px] transition-transform duration-500 ease-out" style={{ transform: 'translate(-500px, -500px)' }}></div>

        {/* --- BACKGROUND ANIMATIONS --- */}
        <div className="absolute top-[5%] left-[10%] z-0 w-[300px] h-[300px] bg-blue-600/40 rounded-full blur-[80px] pointer-events-none force-animate-blob"></div>
        <div className="absolute bottom-[5%] right-[10%] z-0 w-[300px] h-[300px] bg-indigo-600/40 rounded-full blur-[80px] pointer-events-none force-animate-blob force-delay"></div>

        {/* --- MAIN CONTENT --- */}
        <div className="max-w-2xl w-full z-10 relative">
          <div className="text-center space-y-4 mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wider uppercase">
              <FiTrendingUp /> Real-time Market Data
            </div>
            
            <h1 className="text-7xl font-black tracking-tighter bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
              STOCKIFY
            </h1>
            <p className="text-gray-400 text-lg max-w-md mx-auto">
              Track your favorite stocks with minimalist, precision-driven data.
            </p>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            
            <div className="relative flex items-center bg-[#111] border border-white/10 rounded-2xl p-2 focus-within:border-blue-500/50 transition-all shadow-2xl hover:border-white/20">
              <div className="pl-4 text-gray-500">
                <FiSearch size={24} />
              </div>
              
              <input
                type="text"
                placeholder="Search Ticker (e.g. AAPL, TSLA)"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()} // מאפשר חיפוש בלחיצה על Enter
                className="w-full bg-transparent px-4 py-4 text-xl outline-none placeholder:text-gray-600 font-medium"
              />
              
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-wait text-white px-8 py-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20 z-20 relative cursor-pointer"
              >
                {loading ? "Loading..." : "Analyze"}
              </button>
            </div>
          </div>

          {/* --- RESULTS SECTION --- */}
          {/* מציג הודעת שגיאה אם יש */}
          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-center font-medium">
              {error}
            </div>
          )}

          {/* מציג את הנתונים אם קיבלנו אותם בהצלחה */}
          {stockData && (
            <div className="mt-8 p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl text-center transform transition-all">
              <h2 className="text-2xl font-bold text-gray-400 mb-2 tracking-widest">{ticker}</h2>
              <div className="flex flex-col items-center gap-2">
                <span className="text-7xl font-black">${stockData.price.toFixed(2)}</span>
                
                {/* קביעת צבע לירוק או אדום לפי העלייה/ירידה */}
                <div className={`flex items-center text-2xl font-bold ${stockData.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stockData.change >= 0 ? <FiArrowUp className="mr-1" /> : <FiArrowDown className="mr-1" />}
                  <span>${Math.abs(stockData.change).toFixed(2)}</span>
                  <span className="ml-2 opacity-80">({Math.abs(stockData.percent).toFixed(2)}%)</span>
                </div>
              </div>
            </div>
          )}

          {/* --- FOOTER STATS --- */}
          <div className="mt-12 flex justify-center items-center gap-8 text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              NYSE
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              NASDAQ
            </div>
          </div>
        </div>
      </main>
    </>
  );
}