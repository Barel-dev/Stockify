"use client";

import { useState } from "react";

export default function Home() {
  // משתנה State שיחזיק את מה שהמשתמש כותב בתיבת החיפוש
  const [ticker, setTicker] = useState("");

  const handleSearch = () => {
    if (!ticker) return;
    // בינתיים רק נדפיס ללוג כדי לראות שזה עובד
    console.log("Searching for ticker:", ticker);
    alert("מחפש נתונים עבור: " + ticker);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50 text-black">
      <div className="max-w-md w-full text-center space-y-8">
        <h1 className="text-5xl font-extrabold tracking-tight text-blue-600">
          Stockify
        </h1>
        <p className="text-gray-500 text-lg">
          הזן Ticker של מניה (למשל AAPL או TSLA) כדי לקבל פרטים
        </p>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Search Ticker..."
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="w-full px-5 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
          />
          <button
            onClick={handleSearch}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
          >
            Search
          </button>
        </div>
      </div>
    </main>
  );
}