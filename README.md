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
  <img src="https://img.shields.io/badge/Clerk-Auth-6C47FF?style=for-the-badge&logo=clerk&logoColor=white" alt="Clerk" />
  <img src="https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Finnhub-API-22c55e?style=for-the-badge" alt="Finnhub API" />
  <img src="https://img.shields.io/badge/TradingView-Charts-f97316?style=for-the-badge" alt="TradingView" />
</p>

---

## 🎯 What Is Stockify?

Stockify is a **fullstack market intelligence dashboard** built with Next.js. Enter any ticker — stocks (`AAPL`), crypto (`BTCUSDT`), or forex (`EUR/USD`) — and get a **complete analysis** in seconds.

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
| ⭐ | **Watchlist** | Save tickers with live prices — requires sign-in |
| 🔐 | **Authentication** | Google & GitHub sign-in via Clerk |
| 🛡️ | **Server-side API** | All API calls routed through Next.js API routes — API key hidden from client |
| 🌙 | **Dark Glassmorphism UI** | Sleek animated dark theme with blur effects & glow animations |
| 📱 | **Fully Responsive** | Desktop, tablet & mobile optimized |

---

## 🖥️ Screenshots

<p align="center">
  <i>Search any ticker and get instant market intelligence</i>
</p>

---

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│   Browser    │ ───▶ │  Next.js API      │ ───▶ │  Finnhub    │
│  (React UI)  │      │  Routes (/api/*)  │      │  API        │
└─────────────┘      └──────────────────┘      └─────────────┘
       │                      │
       │                      ▼
       │              ┌──────────────────┐
       │              │    Supabase      │
       │              │   (PostgreSQL)   │
       └──────────────┤   - Watchlists   │
        Clerk Auth    └──────────────────┘
```

- **Frontend** calls `/api/*` routes (never Finnhub directly)
- **API routes** proxy requests to Finnhub server-side, hiding the API key
- **Clerk** handles authentication (Google + GitHub OAuth)
- **Supabase** stores user watchlists with Row Level Security

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** 18+
- A free **Finnhub API key** → [Get one here](https://finnhub.io/register)
- A free **Clerk account** → [Sign up here](https://clerk.com)
- A free **Supabase account** → [Sign up here](https://supabase.com)

### 1️⃣ Clone & Install

```bash
git clone https://github.com/your-username/stockify.git
cd stockify
npm install
```

### 2️⃣ Set Up Clerk

1. Go to [clerk.com](https://clerk.com) and create a new application
2. Enable **Google** and **GitHub** as sign-in providers
3. Copy the **Publishable Key** and **Secret Key**

### 3️⃣ Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open the **SQL Editor** and run:

```sql
create table watchlist (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  symbol text not null,
  company_name text not null default '',
  added_at timestamptz default now()
);

create index idx_watchlist_user_id on watchlist(user_id);
create unique index idx_watchlist_user_symbol on watchlist(user_id, symbol);
```

3. Go to **Settings → API** and copy the **URL** and **service_role key**

### 4️⃣ Configure Environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```
FINNHUB_API_KEY=your_key_here
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 5️⃣ Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

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

4. ⭐ **Save** — Sign in and click "Add to Watchlist" to save tickers
5. 📋 **Watchlist** — View all saved tickers with live prices at `/watchlist`

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| ⚡ [Next.js 14](https://nextjs.org) | React framework with App Router |
| 🔷 [TypeScript](https://typescriptlang.org) | Type safety |
| 🎨 [Tailwind CSS](https://tailwindcss.com) | Utility-first styling |
| 🔐 [Clerk](https://clerk.com) | Authentication (Google + GitHub OAuth) |
| 🗄️ [Supabase](https://supabase.com) | PostgreSQL database for watchlists |
| 🌙 [next-themes](https://github.com/pacocoursey/next-themes) | Dark mode support |
| 🎭 [react-icons](https://react-icons.github.io/react-icons/) | Icon library |
| 📡 [Finnhub API](https://finnhub.io) | Market data provider |
| 📈 [TradingView Widget](https://www.tradingview.com/widget/) | Interactive charting |

---

## 📁 Project Structure

```
stockify/
├── 📂 app/
│   ├── layout.tsx              # Root layout + ClerkProvider
│   ├── page.tsx                # Main dashboard
│   ├── 📂 watchlist/
│   │   └── page.tsx            # Watchlist page (protected)
│   └── 📂 api/
│       ├── quote/route.ts      # Price quotes
│       ├── search/route.ts     # Ticker search
│       ├── candles/route.ts    # Historical candles
│       ├── company/route.ts    # Company profile
│       ├── news/route.ts       # Company news
│       ├── earnings/route.ts   # Earnings data
│       ├── recommendations/route.ts  # Analyst ratings
│       ├── metrics/route.ts    # Financial metrics
│       ├── price-target/route.ts     # Price targets
│       └── watchlist/route.ts  # Watchlist CRUD
├── 📂 lib/
│   ├── finnhub.ts              # Server-side Finnhub client
│   └── supabase.ts             # Server-side Supabase client
├── middleware.ts               # Clerk auth middleware
├── 📂 public/
│   └── favicon.svg             # App icon
├── 📂 styles/
│   └── globals.css             # Tailwind + custom animations
├── .env.example                # Env vars template
├── next.config.js              # Next.js config
├── tailwind.config.ts          # Tailwind config
├── tsconfig.json               # TypeScript config
└── package.json                # Dependencies
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
