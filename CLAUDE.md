# Stockify

Real-time stock, crypto, and forex market intelligence dashboard.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Auth:** Clerk v7 (`@clerk/nextjs`)
- **Database:** Supabase PostgreSQL (lazy init via `lib/supabase.ts`)
- **Market Data:** Finnhub API (free tier, 60 req/min limit)
- **Styling:** Tailwind CSS 3 — dark glassmorphism theme
- **Testing:** Jest + React Testing Library
- **Deployment:** Vercel

## Project Structure

```
app/
  page.tsx              # Main search & analysis dashboard (~2800 lines)
  compare/page.tsx      # Side-by-side ticker comparison with TradingView chart
  watchlist/page.tsx     # Saved tickers with live WebSocket prices
  portfolio/page.tsx     # Holdings tracker with P&L
  screener/page.tsx      # Filter & sort top 50 S&P 500 stocks
  heatmap/page.tsx       # Sector heatmap with market overview
  layout.tsx             # Root layout with ClerkProvider
  sw-registrar.tsx       # PWA service worker registration
  api/
    quote/               # GET /api/quote?symbol=X
    search/              # GET /api/search?q=X
    company/             # GET /api/company?symbol=X
    candles/             # GET /api/candles?symbol=X&resolution=D&from=&to=
    news/                # GET /api/news?symbol=X
    earnings/            # GET /api/earnings?symbol=X
    recommendations/     # GET /api/recommendations?symbol=X
    metrics/             # GET /api/metrics?symbol=X
    price-target/        # GET /api/price-target?symbol=X
    watchlist/           # GET/POST/DELETE — Clerk auth + Supabase
    portfolio/           # GET/POST/DELETE — Clerk auth + Supabase
    alerts/              # GET/POST/DELETE — Clerk auth + Supabase
    ws-token/            # GET — returns Finnhub API key for WebSocket

components/
  Navbar.tsx             # Shared nav with logo, links, auth (used on all pages)

lib/
  finnhub.ts             # Finnhub API wrapper (reads env at request time, not module init)
  supabase.ts            # Lazy Supabase client init
  export.ts              # PDF (jsPDF) and CSV export utilities
  use-live-prices.ts     # WebSocket hook for real-time Finnhub prices
  use-alert-checker.ts   # Price alert polling + browser notifications
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

## Key Patterns

### Finnhub Rate Limiting
Free tier = 60 requests/minute. Mitigations:
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
Dark glassmorphism theme — all pages use:
- `bg-[#050505]` or `bg-black` base
- `bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl` for cards
- `text-emerald-400` for positive, `text-rose-400` for negative
- Animated gradient blobs in background
- `font-sans` = Inter Tight

### Database Tables
Supabase tables: `watchlist`, `portfolio`, `alerts` — all keyed by `user_id` (Clerk user ID).

### PWA
`public/manifest.json`, `public/sw.js` — network-first for API, cache-first for static assets.
