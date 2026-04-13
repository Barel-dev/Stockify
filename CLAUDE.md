# Stockify

Real-time stock, crypto, and forex market intelligence dashboard.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Auth:** Clerk v7 (`@clerk/nextjs`)
- **Database:** Supabase PostgreSQL (lazy init via `lib/supabase.ts`)
- **Market Data:** Finnhub API (free tier, 60 req/min limit)
- **Charts:** Lightweight Charts v5 (TradingView open-source) + TradingView widgets
- **Styling:** Tailwind CSS 3 — dark/light glassmorphism theme
- **Caching:** Upstash Redis (optional, graceful fallback)
- **Analytics:** Vercel Analytics + Speed Insights
- **Testing:** Jest + React Testing Library
- **Deployment:** Vercel

## Project Structure

```
app/
  page.tsx              # Main search & analysis dashboard with market overview
  stock/[symbol]/       # SEO-friendly stock detail route (redirects to main with ticker)
  compare/page.tsx      # Side-by-side ticker comparison (up to 4 tickers)
  watchlist/page.tsx     # Saved tickers with live WebSocket prices + drag-and-drop
  portfolio/page.tsx     # Holdings tracker with P&L, allocation chart, CSV import
  screener/page.tsx      # Filter & sort top 50 S&P 500 stocks (with presets)
  heatmap/page.tsx       # Sector heatmap with market overview
  earnings/page.tsx      # Weekly earnings calendar with EPS estimates
  layout.tsx             # Root layout with ClerkProvider, Analytics, OnboardingTour
  sw-registrar.tsx       # PWA service worker registration
  api/
    quote/               # GET /api/quote?symbol=X (cached 30s)
    search/              # GET /api/search?q=X
    company/             # GET /api/company?symbol=X (cached 1h)
    candles/             # GET /api/candles?symbol=X&resolution=D&from=&to=&type=
    news/                # GET /api/news?symbol=X
    earnings/            # GET /api/earnings?symbol=X
    earnings-calendar/   # GET /api/earnings-calendar?from=&to=
    recommendations/     # GET /api/recommendations?symbol=X (cached 5min)
    metrics/             # GET /api/metrics?symbol=X (cached 5min)
    price-target/        # GET /api/price-target?symbol=X
    exchange-rates/      # GET /api/exchange-rates (USD/EUR/GBP/ILS)
    watchlist/           # GET/POST/DELETE — Clerk auth + Supabase
    portfolio/           # GET/POST/DELETE — Clerk auth + Supabase
    alerts/              # GET/POST/DELETE — Clerk auth + Supabase
    ws-token/            # GET — returns Finnhub API key for WebSocket

components/
  Navbar.tsx             # Shared nav with logo, links, auth, currency selector, theme toggle
  Background.tsx         # Shared background with mouse glow, animated blobs, theme support
  HistoricalChart.tsx    # Custom candlestick/line chart with 1D-5Y time ranges (lazy loaded)
  StockChart.tsx         # Interactive candlestick/line chart (Lightweight Charts v5)
  ErrorBoundary.tsx      # React error boundary with retry
  KeyboardShortcuts.tsx  # Cmd+K search focus, Alt+1-6 navigation
  OnboardingTour.tsx     # First-time user walkthrough (localStorage gated)
  Skeleton.tsx           # Shimmer loading skeleton components

lib/
  finnhub.ts             # Finnhub API wrapper (reads env at request time, not module init)
  supabase.ts            # Lazy Supabase client init
  cache.ts               # Upstash Redis caching layer (graceful fallback if not configured)
  currency.ts            # Multi-currency support (USD/EUR/GBP/ILS) + exchange rates
  use-currency.ts        # React hook for currency state + conversion across pages
  use-theme.ts           # Dark/light theme hook with localStorage persistence
  export.ts              # PDF (jsPDF) and CSV export utilities
  use-live-prices.ts     # WebSocket hook for real-time Finnhub prices
  use-alert-checker.ts   # Price alert polling + browser/sound notifications
```

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Jest tests
npm run test:ci      # Jest in CI mode (--ci --passWithNoTests)
```

## Environment Variables

Required in `.env.local` (and Vercel dashboard for production):

```
FINNHUB_API_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional (for Redis caching):
```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Key Patterns

### Finnhub Rate Limiting
Free tier = 60 requests/minute. Mitigations:
- **Redis caching:** quote (30s), company (1h), metrics (5min), recommendations (5min)
- **Batching:** Heatmap and screener fetch in groups of 8 with 1.2s delays
- **Sequential fetching:** Compare page fetches tickers one at a time, not parallel
- **Stock detection:** `!symbol.includes(":")` — only fetch stock-specific endpoints (recommendations, earnings, price-target) for actual stocks, not crypto/forex

### Env Var Access
`lib/finnhub.ts` reads `process.env.FINNHUB_API_KEY` inside the function, not at module top level. This is required for Vercel serverless functions.

### Auth
- Clerk middleware in `middleware.ts` protects `/watchlist` and `/portfolio` routes
- `Navbar.tsx` handles Sign In / UserButton on all pages
- API routes for watchlist/portfolio/alerts use `auth()` from Clerk

### Design System
Dark/light glassmorphism theme — all pages use:
- `Background.tsx` shared component with mouse-following glow + animated blobs
- `useTheme()` hook for dark/light mode (localStorage persisted, event-driven)
- `bg-[#050505]` dark / `bg-[#f5f5f7]` light base
- `bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl` for cards
- `text-emerald-400` for positive, `text-rose-400` for negative
- Shimmer skeleton loaders (animate-[shimmer_1.5s_infinite])
- `font-sans` = Inter Tight

### Multi-Currency
- `useCurrency()` hook provides `{ symbol, convert, currency, rates }`
- Navbar dispatches `currency-change` CustomEvent; hook listens for it
- Exchange rates fetched from `/api/exchange-rates` (Finnhub forex quotes)
- All pages (main, compare, watchlist, portfolio, screener, heatmap) use the hook

### Lightweight Charts v5 API
Uses `chart.addSeries(CandlestickSeries, {...})` not v4's `addCandlestickSeries()`.

### Code Splitting
- `HistoricalChart` is lazy-loaded via `React.lazy()` with Suspense fallback
- Reduces initial JS bundle for the main dashboard page

### Database Tables
Supabase tables: `watchlist`, `portfolio`, `alerts` — all keyed by `user_id` (Clerk user ID).

### PWA
`public/manifest.json`, `public/sw.js` — network-first for API, cache-first for static assets.

### Live Prices
- Watchlist uses `useLivePrices` WebSocket hook for real-time updates
- Main dashboard connects to Finnhub WebSocket for the currently viewed stock ticker
- Shows "LIVE" badge with pulsing indicator when WebSocket is streaming

### Compare Page
- Supports 2-4 tickers with add/remove buttons
- Head-to-head comparison table only shown for 2-ticker comparisons
- Performance chart and normalized % comparison for 2-ticker mode
- Adaptive grid layout based on number of tickers
