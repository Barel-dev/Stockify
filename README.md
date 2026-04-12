<p align="center">
  <img src="public/favicon.svg" width="100" alt="Stockify Logo" />
</p>

<h1 align="center">✨ Stockify</h1>

<p align="center">
  <b>🚀 Real-time Stock, Crypto & Forex Intelligence Dashboard</b><br/>
  <i>One search. Full market breakdown. Instant insights.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Finnhub-API-22c55e?style=for-the-badge" alt="Finnhub API" />
  <img src="https://img.shields.io/badge/TradingView-Charts-f97316?style=for-the-badge" alt="TradingView" />
</p>

---

## 🎯 What Is Stockify?

Stockify is a **premium market intelligence dashboard** built with Next.js. Enter any ticker — stocks (`AAPL`), crypto (`BTCUSDT`), or forex (`EUR/USD`) — and get a **complete analysis** in seconds.

> 💡 No finance jargon. Everything explained in plain language.

---

## 🔥 Features

| | Feature | Description |
|---|---|---|
| 📊 | **Live Market Data** | Real-time price, daily change, open/high/low, previous close |
| 📈 | **Interactive Charts** | Full TradingView charts with drawing tools, indicators & timeframes |
| 🧠 | **Technical Analysis** | RSI, MACD, SMA, EMA, ATR, volatility, support & resistance — all computed client-side |
| 🎯 | **Composite Score** | Weighted signal (Strong Buy → Strong Sell) combining trend, momentum, sentiment & stability |
| 🏦 | **Analyst Ratings** | Wall Street consensus, price targets & recommendation trends |
| 💰 | **Earnings History** | Quarterly results with actual vs. estimated EPS & surprise % |
| 📰 | **Latest News** | Recent headlines with direct links to full articles |
| 🏢 | **Company Profile** | Sector, industry, market cap, IPO date & logo |
| 🌙 | **Dark Glassmorphism UI** | Sleek animated dark theme with blur effects & glow animations |
| 📱 | **Fully Responsive** | Desktop, tablet & mobile optimized |

---

## 🖥️ Screenshots

<p align="center">
  <i>Search any ticker and get instant market intelligence</i>
</p>

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** 18+
- A free **Finnhub API key** → [Get one here](https://finnhub.io/register)

### Setup

```bash
# 1️⃣ Clone the repo
git clone https://github.com/your-username/stockify.git
cd stockify

# 2️⃣ Install dependencies
npm install

# 3️⃣ Set up your API key
cp .env.example .env.local
# Edit .env.local and paste your Finnhub API key

# 4️⃣ Start the dev server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) 🎉

---

## 🧭 How To Use

1. 🔍 **Search** — Type a ticker (`AAPL`, `MSFT`, `BTCUSDT`, `EUR/USD`)
2. 📋 **Select** — Pick from autocomplete suggestions or press Enter
3. 📊 **Explore** — Browse the tabs:

| Tab | What You'll Find |
|---|---|
| 📊 **Overview** | Chart, price metrics, composite score, key levels, analyst consensus |
| 📈 **Technical** | RSI, MACD, moving averages, ATR, volatility breakdown |
| 🏦 **Fundamentals** | Earnings history, company profile, price targets |
| 📰 **News** | Latest headlines with links to full articles |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| ⚡ [Next.js 14](https://nextjs.org) | React framework with App Router |
| 🔷 [TypeScript](https://typescriptlang.org) | Type safety |
| 🎨 [Tailwind CSS](https://tailwindcss.com) | Utility-first styling |
| 🌙 [next-themes](https://github.com/pacocoursey/next-themes) | Dark mode support |
| 🎭 [react-icons](https://react-icons.github.io/react-icons/) | Icon library |
| 📡 [Finnhub API](https://finnhub.io) | Market data provider |
| 📈 [TradingView Widget](https://www.tradingview.com/widget/) | Interactive charting |

---

## 📁 Project Structure

```
stockify/
├── 📂 app/
│   ├── layout.tsx          # Root layout + theme provider
│   └── page.tsx            # Main dashboard
├── 📂 public/
│   └── favicon.svg         # App icon
├── 📂 styles/
│   └── globals.css         # Tailwind + custom animations
├── .env.example            # API key template
├── next.config.js          # Next.js config
├── tailwind.config.ts      # Tailwind config
├── tsconfig.json           # TypeScript config
└── package.json            # Dependencies
```

---

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run dev` | 🚀 Start development server |
| `npm run build` | 📦 Build for production |
| `npm start` | ▶️ Start production server |
| `npm run lint` | 🔍 Run ESLint |

---

## ⚠️ API Rate Limits

Stockify uses the **Finnhub free tier** (60 calls/min). The app is designed to stay within limits, but rapid searching may temporarily hit the cap. [Paid plans](https://finnhub.io/pricing) offer higher limits.

---

## 📄 License

ISC

---

<p align="center">
  Made with ❤️ by <b>Barel</b>
</p>
