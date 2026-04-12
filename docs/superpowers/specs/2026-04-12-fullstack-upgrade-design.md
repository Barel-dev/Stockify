# Stockify Fullstack Upgrade — Design Spec

## Overview

Transform Stockify from a frontend-only dashboard into a fullstack application with authentication, a database-backed watchlist, and server-side API routes. The goal is to make this a strong fullstack portfolio project.

**Tech choices:**
- **Auth:** Clerk (Google + GitHub OAuth)
- **Database:** Supabase (PostgreSQL)
- **API:** Next.js App Router API routes (server-side proxy to Finnhub)

---

## 1. Authentication (Clerk)

### What
Add user sign-in/sign-up using Clerk with Google and GitHub OAuth providers.

### UI Changes
- **Top-right corner** (fixed, next to logo): Sign In button when logged out
- **When signed in:** User avatar with dropdown menu (sign out)
- **Watchlist page** is protected — redirects to sign-in if not authenticated
- The main search/analysis flow remains accessible without signing in (no gate on core functionality)

### Implementation
- Install `@clerk/nextjs`
- Wrap app in `<ClerkProvider>` in `app/layout.tsx`
- Add Clerk middleware (`middleware.ts`) to protect `/watchlist` route
- Use `<SignInButton>`, `<UserButton>` components in the header area
- Clerk env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`

---

## 2. Server-Side API Routes

### What
Move all Finnhub API calls from the client to Next.js API routes. The frontend will call our own `/api/*` endpoints, which proxy to Finnhub server-side. This hides the API key from the browser.

### Routes

| Route | Finnhub Endpoint | Purpose |
|---|---|---|
| `GET /api/quote?symbol=X` | `/quote` | Current price data |
| `GET /api/search?q=X` | `/search` | Ticker search/autocomplete |
| `GET /api/candles?symbol=X&from=X&to=X&resolution=X` | `/stock/candle` | Historical price data |
| `GET /api/company?symbol=X` | `/stock/profile2` | Company profile |
| `GET /api/news?symbol=X` | `/company-news` | Company news |
| `GET /api/earnings?symbol=X` | `/stock/earnings` | Earnings history |
| `GET /api/recommendations?symbol=X` | `/stock/recommendation` | Analyst recommendations |
| `GET /api/forex?symbol=X` | `/forex/candles` | Forex candle data |

### Implementation
- Each route lives in `app/api/<name>/route.ts`
- Each route reads `FINNHUB_API_KEY` from server-side env (no `NEXT_PUBLIC_` prefix)
- Basic error handling: return appropriate HTTP status codes
- Update `page.tsx` fetch calls to use `/api/*` instead of Finnhub directly
- Remove `NEXT_PUBLIC_FINNHUB_API_KEY` from client-side env — rename to `FINNHUB_API_KEY`

---

## 3. Database (Supabase)

### What
A PostgreSQL database on Supabase to store user watchlists.

### Schema

```sql
create table watchlist (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,          -- Clerk user ID
  symbol text not null,
  company_name text not null default '',
  added_at timestamptz default now()
);

-- Index for fast lookups
create index idx_watchlist_user_id on watchlist(user_id);

-- Unique constraint: one entry per user per symbol
create unique index idx_watchlist_user_symbol on watchlist(user_id, symbol);
```

### Row Level Security
- Enable RLS on `watchlist` table
- Policy: users can only SELECT, INSERT, DELETE rows where `user_id` matches their Clerk ID
- Since we call Supabase from API routes (server-side with service role key), RLS is enforced by passing the user ID in queries

### API Routes for Watchlist

| Route | Method | Purpose |
|---|---|---|
| `/api/watchlist` | GET | Get current user's watchlist |
| `/api/watchlist` | POST | Add a ticker (body: `{ symbol, companyName }`) |
| `/api/watchlist` | DELETE | Remove a ticker (body: `{ symbol }`) |

### Implementation
- Install `@supabase/supabase-js`
- Create a server-side Supabase client using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Watchlist API routes use Clerk's `auth()` to get the user ID, then query Supabase
- Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

---

## 4. Watchlist Feature

### UI — Analysis Page
- **Bookmark/star icon** next to the ticker name in the analysis header
- Filled star = in watchlist, outline star = not in watchlist
- Click to toggle (add/remove)
- Only visible when signed in
- Optimistic UI: update immediately, revert on error

### UI — Watchlist Page (`/watchlist`)
- Protected route (Clerk middleware redirects to sign-in)
- Grid of compact cards, each showing:
  - Ticker symbol
  - Company name
  - Live price (fetched via `/api/quote`)
  - Daily change % with color (green/red)
  - Remove button (X icon)
- Click a card → navigates to main page and triggers search for that ticker
- Empty state: friendly message + CTA to search for stocks
- Loading skeleton while fetching

### Data Flow
1. Page loads → fetch `/api/watchlist` to get saved symbols
2. For each symbol → fetch `/api/quote` to get live prices
3. Render cards with data
4. Remove → `DELETE /api/watchlist` → remove card from UI

---

## 5. Environment Variables

### Before (client-side, exposed)
```
NEXT_PUBLIC_FINNHUB_API_KEY=xxx
```

### After (server-side, hidden)
```
FINNHUB_API_KEY=xxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=xxx
CLERK_SECRET_KEY=xxx
SUPABASE_URL=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

Update `.env.example` to reflect the new structure.

---

## 6. File Structure (New/Modified)

```
app/
├── layout.tsx                    # Modified: add ClerkProvider
├── page.tsx                      # Modified: use /api/* routes, add bookmark button
├── watchlist/
│   └── page.tsx                  # New: watchlist page
├── api/
│   ├── quote/route.ts            # New
│   ├── search/route.ts           # New
│   ├── candles/route.ts          # New
│   ├── company/route.ts          # New
│   ├── news/route.ts             # New
│   ├── earnings/route.ts         # New
│   ├── recommendations/route.ts  # New
│   └── watchlist/route.ts        # New
middleware.ts                     # New: Clerk auth middleware
lib/
├── supabase.ts                   # New: server-side Supabase client
└── finnhub.ts                    # New: shared Finnhub fetch helper
```

---

## Non-Goals

- No price alerts (future enhancement)
- No compare mode (future enhancement)
- No watchlist categories/folders (keep it simple)
- No real-time WebSocket price updates (polling on page load is enough)
