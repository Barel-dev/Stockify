<p align="center">
  <img src="public/favicon.svg" width="80" alt="Stockify Logo" />
</p>

<h1 align="center">Stockify</h1>

<p align="center">
  <b>Real-time stock, crypto, and forex analysis dashboard</b><br/>
  Type any ticker and instantly get price data, technical analysis, analyst ratings, earnings, and interactive charts — all in one place.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-38bdf8?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/API-Finnhub-green" alt="Finnhub API" />
  <img src="https://img.shields.io/badge/Charts-TradingView-orange" alt="TradingView" />
</p>

---

## What It Does

Stockify is a single-page market intelligence dashboard. Enter a ticker symbol (like `AAPL`, `BTCUSDT`, or `EUR/USD`) and get a complete breakdown:

- **Live price data** — current price, daily change, open, high, low, previous close
- **Interactive TradingView chart** — full-featured chart with drawing tools, indicators (RSI, MACD, SMA, etc.), and multiple timeframes
- **Technical analysis** — RSI, MACD, moving averages, ATR, volatility, support/resistance levels — all computed client-side
- **Composite score** — a weighted signal (Strong Buy → Strong Sell) combining trend, momentum, sentiment, and stability
- **Analyst ratings** — Wall Street consensus, price targets, and recommendation trends
- **Earnings history** — past quarterly results with actual vs. estimated EPS and surprise percentage
- **Latest news** — recent headlines related to the ticker
- **Company info** — sector, industry, market cap, IPO date, and logo

Everything is written in plain, easy-to-understand language — no finance jargon.

---

## Features

| Feature | Description |
|---|---|
| **Multi-asset support** | Stocks, crypto, and forex pairs |
| **Smart search** | Debounced input with autocomplete suggestions and race condition handling |
| **TradingView charts** | Professional-grade interactive charts embedded directly |
| **Client-side technicals** | RSI, MACD, SMA, EMA, ATR, and volatility calculated in the browser |
| **Composite scoring** | Weighted algorithm combining 4 market dimensions into a single signal |
| **Dark theme** | Sleek dark glassmorphism design with animated background |
| **Responsive** | Works on desktop, tablet, and mobile |
| **Hover effects** | Smooth interactive animations on all cards and elements |
| **Tabbed layout** | Overview, Technical, Fundamentals, and News tabs to organize data |

---

## Getting Started

### Prerequisites

- **Node.js** 18 or later
- **npm** (comes with Node.js)
- A free **Finnhub API key** — [sign up here](https://finnhub.io/register)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/stockify.git
   cd stockify
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up your API key**

   Create a `.env.local` file in the root directory:

   ```
   NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_api_key_here
   ```

   You can also copy the example file:

   ```bash
   cp .env.example .env.local
   ```

   Then replace `your_finnhub_api_key_here` with your actual key from [finnhub.io](https://finnhub.io).

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open the app**

   Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage

1. Type a ticker symbol into the search bar (e.g., `AAPL`, `MSFT`, `BTCUSDT`, `EUR/USD`)
2. Select a suggestion from the dropdown or press Enter
3. Browse the tabs:
   - **Overview** — chart, price metrics, composite score, key levels, analyst consensus
   - **Technical** — detailed chart, RSI, MACD, moving averages, ATR, volatility
   - **Fundamentals** — earnings history, company profile, price targets
   - **News** — latest headlines with links to full articles

---

## Tech Stack

| Technology | Purpose |
|---|---|
| [Next.js 14](https://nextjs.org) | React framework with App Router |
| [TypeScript](https://typescriptlang.org) | Type safety |
| [Tailwind CSS](https://tailwindcss.com) | Utility-first styling |
| [next-themes](https://github.com/pacocoursey/next-themes) | Dark mode support |
| [react-icons](https://react-icons.github.io/react-icons/) | Icon library |
| [Finnhub API](https://finnhub.io) | Market data (quotes, candles, news, earnings, recommendations) |
| [TradingView Widget](https://www.tradingview.com/widget/) | Interactive charting |

---

## Project Structure

```
stockify/
├── app/
│   ├── layout.tsx          # Root layout with theme provider
│   └── page.tsx            # Main dashboard (all components)
├── public/
│   └── favicon.svg         # App icon
├── styles/
│   └── globals.css         # Tailwind imports + custom animations
├── .env.example            # API key template
├── next.config.js          # Next.js configuration
├── tailwind.config.ts      # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

## API Rate Limits

Stockify uses the **Finnhub free tier**, which allows **60 API calls per minute**. The app is designed to work within these limits, but if you search very rapidly you may temporarily hit the cap. Paid Finnhub plans offer higher limits.

---

## License

ISC
