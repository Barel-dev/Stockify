# Stockify Fullstack Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Stockify into a fullstack app with Clerk auth, server-side API routes, Supabase database, and a watchlist feature.

**Architecture:** Next.js API routes proxy all Finnhub calls server-side (hiding the API key). Clerk handles auth with Google/GitHub OAuth. Supabase stores watchlists per user. A new `/watchlist` page shows saved tickers with live prices.

**Tech Stack:** Next.js 14, Clerk, Supabase (PostgreSQL), TypeScript, Tailwind CSS

---

## File Structure

```
New files:
  app/api/quote/route.ts             — Proxy Finnhub /quote
  app/api/search/route.ts            — Proxy Finnhub /search
  app/api/candles/route.ts           — Proxy Finnhub candles (stock + forex)
  app/api/company/route.ts           — Proxy Finnhub /stock/profile2
  app/api/news/route.ts              — Proxy Finnhub /company-news
  app/api/earnings/route.ts          — Proxy Finnhub /stock/earnings
  app/api/recommendations/route.ts   — Proxy Finnhub /stock/recommendation
  app/api/metrics/route.ts           — Proxy Finnhub /stock/metric
  app/api/price-target/route.ts      — Proxy Finnhub /stock/price-target
  app/api/watchlist/route.ts         — CRUD for user watchlists
  app/watchlist/page.tsx             — Watchlist dashboard page
  lib/finnhub.ts                     — Shared Finnhub fetch helper
  lib/supabase.ts                    — Server-side Supabase client
  middleware.ts                      — Clerk auth middleware

Modified files:
  app/layout.tsx                     — Wrap in ClerkProvider
  app/page.tsx                       — Use /api/* routes, add bookmark button, add auth UI
  .env.example                       — Update env var names
  .gitignore                         — Add .env
  package.json                       — New dependencies
```

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Clerk, Supabase, and related packages**

```bash
npm install @clerk/nextjs @supabase/supabase-js
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('@clerk/nextjs'); require('@supabase/supabase-js'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Update .env.example**

Replace the contents of `.env.example` with:

```
## Finnhub (server-side only)
FINNHUB_API_KEY=your_finnhub_api_key_here

## Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here

## Supabase
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

- [ ] **Step 4: Update .env.local**

Rename the Finnhub key from `NEXT_PUBLIC_FINNHUB_API_KEY` to `FINNHUB_API_KEY` and add placeholder Clerk/Supabase vars (user fills in real values later):

```
FINNHUB_API_KEY=<existing key value>

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add Clerk and Supabase dependencies"
```

---

### Task 2: Create Finnhub Server-Side Helper

**Files:**
- Create: `lib/finnhub.ts`

- [ ] **Step 1: Create lib directory and helper**

Create `lib/finnhub.ts`:

```typescript
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY ?? "";
const BASE_URL = "https://finnhub.io/api/v1";

export async function finnhubFetch<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T | null> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("token", FINNHUB_API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/finnhub.ts
git commit -m "feat: add server-side Finnhub fetch helper"
```

---

### Task 3: Create API Routes

**Files:**
- Create: `app/api/quote/route.ts`
- Create: `app/api/search/route.ts`
- Create: `app/api/candles/route.ts`
- Create: `app/api/company/route.ts`
- Create: `app/api/news/route.ts`
- Create: `app/api/earnings/route.ts`
- Create: `app/api/recommendations/route.ts`
- Create: `app/api/metrics/route.ts`
- Create: `app/api/price-target/route.ts`

- [ ] **Step 1: Create quote route**

Create `app/api/quote/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  const data = await finnhubFetch("/quote", { symbol });
  if (!data) return NextResponse.json({ error: "Failed to fetch quote" }, { status: 502 });
  return NextResponse.json(data);
}
```

- [ ] **Step 2: Create search route**

Create `app/api/search/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const data = await finnhubFetch("/search", { q });
  if (!data) return NextResponse.json({ error: "Failed to search" }, { status: 502 });
  return NextResponse.json(data);
}
```

- [ ] **Step 3: Create candles route**

Create `app/api/candles/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const resolution = req.nextUrl.searchParams.get("resolution") || "D";
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const type = req.nextUrl.searchParams.get("type") || "stock";

  if (!symbol || !from || !to) {
    return NextResponse.json({ error: "Missing required params" }, { status: 400 });
  }

  const endpoint = type === "forex" ? "/forex/candles" : "/stock/candle";
  const data = await finnhubFetch(endpoint, { symbol, resolution, from, to });
  if (!data) return NextResponse.json({ error: "Failed to fetch candles" }, { status: 502 });
  return NextResponse.json(data);
}
```

- [ ] **Step 4: Create company route**

Create `app/api/company/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  const data = await finnhubFetch("/stock/profile2", { symbol });
  if (!data) return NextResponse.json({ error: "Failed to fetch company" }, { status: 502 });
  return NextResponse.json(data);
}
```

- [ ] **Step 5: Create news route**

Create `app/api/news/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  if (!symbol || !from || !to) {
    return NextResponse.json({ error: "Missing required params" }, { status: 400 });
  }

  const data = await finnhubFetch("/company-news", { symbol, from, to });
  if (!data) return NextResponse.json({ error: "Failed to fetch news" }, { status: 502 });
  return NextResponse.json(data);
}
```

- [ ] **Step 6: Create earnings route**

Create `app/api/earnings/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  const data = await finnhubFetch("/stock/earnings", { symbol });
  if (!data) return NextResponse.json({ error: "Failed to fetch earnings" }, { status: 502 });
  return NextResponse.json(data);
}
```

- [ ] **Step 7: Create recommendations route**

Create `app/api/recommendations/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  const data = await finnhubFetch("/stock/recommendation", { symbol });
  if (!data) return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 502 });
  return NextResponse.json(data);
}
```

- [ ] **Step 8: Create metrics route**

Create `app/api/metrics/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  const data = await finnhubFetch("/stock/metric", { symbol, metric: "all" });
  if (!data) return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 502 });
  return NextResponse.json(data);
}
```

- [ ] **Step 9: Create price-target route**

Create `app/api/price-target/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { finnhubFetch } from "@/lib/finnhub";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  const data = await finnhubFetch("/stock/price-target", { symbol });
  if (!data) return NextResponse.json({ error: "Failed to fetch price target" }, { status: 502 });
  return NextResponse.json(data);
}
```

- [ ] **Step 10: Commit**

```bash
git add app/api/
git commit -m "feat: add server-side API routes for all Finnhub endpoints"
```

---

### Task 4: Update Frontend to Use API Routes

**Files:**
- Modify: `app/page.tsx` (lines 33, 896-1034)

- [ ] **Step 1: Remove client-side API key**

In `app/page.tsx`, remove line 33:

```typescript
// DELETE this line:
const API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? "";
```

- [ ] **Step 2: Update fetchSuggestions to use /api/search**

In `app/page.tsx`, in the `fetchSuggestions` function (~line 907), replace the Finnhub URL:

```typescript
// OLD:
const searchResults = await safeFetchJson<{ result?: FinnhubSearchResult[] }>(
  `https://finnhub.io/api/v1/search?q=${encodeURIComponent(value)}&token=${API_KEY}`
);

// NEW:
const searchResults = await safeFetchJson<{ result?: FinnhubSearchResult[] }>(
  `/api/search?q=${encodeURIComponent(value)}`
);
```

- [ ] **Step 3: Update handleSearch to use /api/* routes**

In `app/page.tsx`, in the `handleSearch` function (~lines 976-1034), replace all Finnhub URLs:

```typescript
const [
  quoteRes,
  profileRes,
  candleRes,
  recommendationRes,
  metricsRes,
  newsRes,
  earningsRes,
  priceTargetRes,
] = await Promise.all([
  safeFetchJson<QuoteData>(
    `/api/quote?symbol=${encodeURIComponent(resolvedSymbol)}`
  ),
  safeFetchJson<ProfileData>(
    `/api/company?symbol=${encodeURIComponent(resolvedSymbol)}`
  ),
  safeFetchJson<CandleData>(
    `/api/candles?symbol=${encodeURIComponent(resolvedSymbol)}&resolution=D&from=${from}&to=${now}&type=${assetType === "forex" ? "forex" : "stock"}`
  ),
  assetType === "stock"
    ? safeFetchJson<RecommendationTrend[]>(
        `/api/recommendations?symbol=${encodeURIComponent(resolvedSymbol)}`
      )
    : Promise.resolve(null),
  assetType === "stock"
    ? safeFetchJson<BasicFinancialsData>(
        `/api/metrics?symbol=${encodeURIComponent(resolvedSymbol)}`
      )
    : Promise.resolve(null),
  assetType === "stock"
    ? safeFetchJson<NewsItem[]>(
        `/api/news?symbol=${encodeURIComponent(resolvedSymbol)}&from=${newsFrom}&to=${newsTo}`
      )
    : Promise.resolve(null),
  assetType === "stock"
    ? safeFetchJson<EarningsItem[]>(
        `/api/earnings?symbol=${encodeURIComponent(resolvedSymbol)}`
      )
    : Promise.resolve(null),
  assetType === "stock"
    ? safeFetchJson<PriceTargetData>(
        `/api/price-target?symbol=${encodeURIComponent(resolvedSymbol)}`
      )
    : Promise.resolve(null),
]);
```

- [ ] **Step 4: Remove the candleEndpoint helper call**

The `getCandleEndpoint` logic is now handled by the API route's `type` param. Remove the `candleEndpoint` variable (~line 974):

```typescript
// DELETE this line:
const candleEndpoint = getCandleEndpoint(resolvedSymbol);
```

The `getCandleEndpoint` function definition can stay (or be removed if unused elsewhere).

- [ ] **Step 5: Verify the app still works**

```bash
npm run dev
```

Open http://localhost:3000, search for `AAPL`. Verify all data loads correctly. Check browser Network tab — requests should go to `/api/*` not `finnhub.io`.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: switch frontend to server-side API routes"
```

---

### Task 5: Set Up Clerk Authentication

**Files:**
- Modify: `app/layout.tsx`
- Create: `middleware.ts`
- Modify: `app/page.tsx` (header area, ~lines 1341-1357)

- [ ] **Step 1: Wrap app in ClerkProvider**

Replace `app/layout.tsx` with:

```typescript
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ThemeProvider } from "next-themes";

import "styles/globals.css";

export const metadata: Metadata = {
  title: "Stockify",
  description: "Premium stock, crypto, and forex analysis with technicals, fundamentals, and news.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100..900;1,100..900&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="bg-white dark:bg-black min-h-screen">
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 2: Create Clerk middleware**

Create `middleware.ts` in the project root:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/watchlist(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

- [ ] **Step 3: Add auth UI to the header**

In `app/page.tsx`, add these imports at the top:

```typescript
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
```

Then update the fixed header area (~line 1341). Replace the existing logo div:

```typescript
// OLD:
<div className="fixed top-5 left-6 z-50 flex items-center gap-2.5">
  <svg ...>...</svg>
  <span className="text-lg font-bold tracking-tight text-white">Stockify</span>
</div>

// NEW:
<div className="fixed top-5 left-6 right-6 z-50 flex items-center justify-between">
  <div className="flex items-center gap-2.5">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-8 w-8">
      <defs>
        <linearGradient id="logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6"/>
          <stop offset="100%" stopColor="#8b5cf6"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="96" fill="#0a0a0a"/>
      <rect x="96" y="280" width="56" height="140" rx="8" fill="url(#logo-g)" opacity="0.5"/>
      <rect x="192" y="200" width="56" height="220" rx="8" fill="url(#logo-g)" opacity="0.65"/>
      <rect x="288" y="140" width="56" height="280" rx="8" fill="url(#logo-g)" opacity="0.8"/>
      <rect x="384" y="80" width="56" height="340" rx="8" fill="url(#logo-g)"/>
      <line x1="124" y1="270" x2="412" y2="70" stroke="#3b82f6" strokeWidth="12" strokeLinecap="round" opacity="0.9"/>
    </svg>
    <span className="text-lg font-bold tracking-tight text-white">Stockify</span>
  </div>
  <div className="flex items-center gap-3">
    {isSignedIn ? (
      <>
        <a
          href="/watchlist"
          className="rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-xl px-4 py-2 text-xs font-bold tracking-wider uppercase text-gray-300 hover:border-blue-500/30 hover:text-white transition-all"
        >
          Watchlist
        </a>
        <UserButton afterSignOutUrl="/" />
      </>
    ) : (
      <SignInButton mode="modal">
        <button className="rounded-full border border-blue-500/30 bg-blue-500/10 backdrop-blur-xl px-4 py-2 text-xs font-bold tracking-wider uppercase text-blue-300 hover:bg-blue-500/20 transition-all">
          Sign In
        </button>
      </SignInButton>
    )}
  </div>
</div>
```

Also add inside the `Home` component, near the top (after state declarations):

```typescript
const { isSignedIn, user } = useUser();
```

- [ ] **Step 4: Verify auth UI renders**

```bash
npm run dev
```

Open http://localhost:3000. You should see the "Sign In" button in the top-right corner. (It won't work until Clerk keys are configured, but it should render.)

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx middleware.ts app/page.tsx
git commit -m "feat: add Clerk authentication with sign-in UI"
```

---

### Task 6: Set Up Supabase Client

**Files:**
- Create: `lib/supabase.ts`

- [ ] **Step 1: Create server-side Supabase client**

Create `lib/supabase.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add server-side Supabase client"
```

---

### Task 7: Create Watchlist API Routes

**Files:**
- Create: `app/api/watchlist/route.ts`

- [ ] **Step 1: Create the watchlist CRUD route**

Create `app/api/watchlist/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { symbol, companyName } = await req.json();
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  const { data, error } = await supabase
    .from("watchlist")
    .upsert(
      { user_id: userId, symbol, company_name: companyName || "" },
      { onConflict: "user_id,symbol" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { symbol } = await req.json();
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", userId)
    .eq("symbol", symbol);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/watchlist/route.ts
git commit -m "feat: add watchlist CRUD API route"
```

---

### Task 8: Add Bookmark Button to Analysis Page

**Files:**
- Modify: `app/page.tsx` (add watchlist state + bookmark icon in analysis header)

- [ ] **Step 1: Add watchlist state and helpers**

In `app/page.tsx`, inside the `Home` component, after the existing state declarations (~line 865), add:

```typescript
const [watchlist, setWatchlist] = useState<string[]>([]);

useEffect(() => {
  if (!isSignedIn) return;
  fetch("/api/watchlist")
    .then((res) => res.json())
    .then((data) => {
      if (Array.isArray(data)) setWatchlist(data.map((item: { symbol: string }) => item.symbol));
    })
    .catch(() => {});
}, [isSignedIn]);

const isInWatchlist = ticker ? watchlist.includes(ticker) : false;

const toggleWatchlist = async () => {
  if (!isSignedIn || !ticker) return;
  const wasInWatchlist = isInWatchlist;

  // Optimistic update
  if (wasInWatchlist) {
    setWatchlist((prev) => prev.filter((s) => s !== ticker));
  } else {
    setWatchlist((prev) => [...prev, ticker]);
  }

  try {
    const res = await fetch("/api/watchlist", {
      method: wasInWatchlist ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: ticker, companyName: companyData?.name || "" }),
    });
    if (!res.ok) throw new Error();
  } catch {
    // Revert on error
    if (wasInWatchlist) {
      setWatchlist((prev) => [...prev, ticker]);
    } else {
      setWatchlist((prev) => prev.filter((s) => s !== ticker));
    }
  }
};
```

- [ ] **Step 2: Add bookmark icon import**

Add `FiStar` to the `react-icons/fi` import at the top of the file:

```typescript
import { FiStar } from "react-icons/fi";
```

(Add it to the existing import block.)

- [ ] **Step 3: Add bookmark button to the analysis header**

In `app/page.tsx`, find the company name heading (~line 1506):

```typescript
<h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight text-white break-words leading-tight">
  {companyData?.name || cleanSymbol(ticker)}
</h2>
```

Add a bookmark button right after it:

```typescript
<h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight text-white break-words leading-tight">
  {companyData?.name || cleanSymbol(ticker)}
</h2>

{isSignedIn && (
  <button
    onClick={toggleWatchlist}
    className={`mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
      isInWatchlist
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
        : "border-white/10 bg-white/[0.05] text-gray-400 hover:border-blue-500/30 hover:text-white"
    }`}
  >
    <FiStar className={isInWatchlist ? "fill-amber-400" : ""} />
    {isInWatchlist ? "In Watchlist" : "Add to Watchlist"}
  </button>
)}
```

- [ ] **Step 4: Verify bookmark button renders**

```bash
npm run dev
```

Search for `AAPL`. The bookmark button should appear below the company name (only when signed in).

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add watchlist bookmark button on analysis page"
```

---

### Task 9: Create Watchlist Page

**Files:**
- Create: `app/watchlist/page.tsx`

- [ ] **Step 1: Create the watchlist page**

Create `app/watchlist/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { FiStar, FiTrendingUp, FiArrowUp, FiArrowDown, FiTrash2, FiSearch } from "react-icons/fi";
import Link from "next/link";

type WatchlistItem = {
  id: string;
  symbol: string;
  company_name: string;
  added_at: string;
};

type QuoteData = {
  c: number;
  d: number;
  dp: number;
};

type WatchlistCardData = WatchlistItem & {
  quote: QuoteData | null;
};

export default function WatchlistPage() {
  const { isSignedIn } = useUser();
  const [items, setItems] = useState<WatchlistCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) return;

    async function load() {
      try {
        const res = await fetch("/api/watchlist");
        const watchlist: WatchlistItem[] = await res.json();

        const withQuotes = await Promise.all(
          watchlist.map(async (item) => {
            const quoteRes = await fetch(`/api/quote?symbol=${encodeURIComponent(item.symbol)}`);
            const quote = quoteRes.ok ? ((await quoteRes.json()) as QuoteData) : null;
            return { ...item, quote };
          })
        );

        setItems(withQuotes);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isSignedIn]);

  const handleRemove = async (symbol: string) => {
    setItems((prev) => prev.filter((i) => i.symbol !== symbol));

    try {
      await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
    } catch {
      // Reload on error
      window.location.reload();
    }
  };

  return (
    <div className="bg-[#050505] text-white font-sans min-h-screen">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[5%] left-[10%] w-[400px] h-[400px] bg-blue-600/30 rounded-full blur-[100px] animate-blob" />
        <div className="absolute bottom-[5%] right-[10%] w-[400px] h-[400px] bg-indigo-600/30 rounded-full blur-[100px] animate-blob" style={{ animationDelay: "2s" }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
      </div>

      {/* Header */}
      <div className="fixed top-5 left-6 right-6 z-50 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-8 w-8">
            <defs>
              <linearGradient id="logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6"/>
                <stop offset="100%" stopColor="#8b5cf6"/>
              </linearGradient>
            </defs>
            <rect width="512" height="512" rx="96" fill="#0a0a0a"/>
            <rect x="96" y="280" width="56" height="140" rx="8" fill="url(#logo-g)" opacity="0.5"/>
            <rect x="192" y="200" width="56" height="220" rx="8" fill="url(#logo-g)" opacity="0.65"/>
            <rect x="288" y="140" width="56" height="280" rx="8" fill="url(#logo-g)" opacity="0.8"/>
            <rect x="384" y="80" width="56" height="340" rx="8" fill="url(#logo-g)"/>
            <line x1="124" y1="270" x2="412" y2="70" stroke="#3b82f6" strokeWidth="12" strokeLinecap="round" opacity="0.9"/>
          </svg>
          <span className="text-lg font-bold tracking-tight text-white">Stockify</span>
        </Link>
      </div>

      {/* Content */}
      <div className="relative z-10 pt-24 px-6 pb-32">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <FiStar className="text-amber-400 text-2xl" />
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">Watchlist</h1>
          </div>
          <p className="text-gray-400 text-sm mb-10">Your saved tickers with live market data.</p>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 animate-pulse">
                  <div className="h-5 w-24 bg-white/10 rounded mb-3" />
                  <div className="h-4 w-40 bg-white/5 rounded mb-4" />
                  <div className="h-8 w-28 bg-white/10 rounded" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20">
              <FiSearch className="mx-auto text-4xl text-gray-600 mb-4" />
              <h2 className="text-xl font-bold text-gray-400 mb-2">No tickers saved yet</h2>
              <p className="text-sm text-gray-500 mb-6">Search for a stock, crypto, or forex pair and add it to your watchlist.</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-6 py-3 text-sm font-bold uppercase tracking-wider text-blue-300 hover:bg-blue-500/20 transition-all"
              >
                <FiSearch /> Search Tickers
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => {
                const price = item.quote?.c ?? 0;
                const change = item.quote?.dp ?? 0;
                const isPositive = change >= 0;

                return (
                  <div
                    key={item.id}
                    className="group rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl transition-all hover:border-blue-500/30 hover:bg-black/70"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <Link href={`/?ticker=${encodeURIComponent(item.symbol)}`} className="min-w-0">
                        <p className="text-lg font-black tracking-tight text-white group-hover:text-blue-300 transition-colors">
                          {item.symbol}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {item.company_name || item.symbol}
                        </p>
                      </Link>
                      <button
                        onClick={() => handleRemove(item.symbol)}
                        className="rounded-full p-2 text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                        title="Remove from watchlist"
                      >
                        <FiTrash2 className="text-sm" />
                      </button>
                    </div>

                    {price > 0 ? (
                      <div>
                        <p className="text-2xl font-black text-white">
                          ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          isPositive
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {isPositive ? <FiArrowUp /> : <FiArrowDown />}
                          {isPositive ? "+" : ""}{change.toFixed(2)}%
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Price unavailable</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/watchlist/page.tsx
git commit -m "feat: add watchlist page with live prices"
```

---

### Task 10: Handle Ticker from URL (Shareable Links)

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Read ticker from URL query param on page load**

In `app/page.tsx`, add `useSearchParams` import:

```typescript
import { useSearchParams } from "next/navigation";
```

Then inside the `Home` component, after existing state declarations, add:

```typescript
const searchParams = useSearchParams();

useEffect(() => {
  const urlTicker = searchParams.get("ticker");
  if (urlTicker && !stockData) {
    setTicker(urlTicker.toUpperCase());
    handleSearch(urlTicker.toUpperCase());
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [searchParams]);
```

- [ ] **Step 2: Wrap the page export in Suspense**

Since `useSearchParams` requires Suspense in Next.js 14 App Router, update the export:

```typescript
import { Suspense } from "react";

// Rename the current Home component to HomeContent
// Then export:
export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
```

- [ ] **Step 3: Verify shareable links work**

Open http://localhost:3000/?ticker=AAPL — it should auto-search for Apple.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: support ticker in URL for shareable links from watchlist"
```

---

### Task 11: Supabase Table Setup Instructions

This task is a manual step for the user — document the SQL they need to run in Supabase.

- [ ] **Step 1: Add setup instructions to the spec**

The user needs to run this SQL in their Supabase dashboard (SQL Editor):

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

- [ ] **Step 2: Update README with setup instructions for Clerk + Supabase**

Add a new section to `README.md` after the Quick Start section documenting:
1. Create a Clerk app at clerk.com, enable Google + GitHub OAuth, copy keys
2. Create a Supabase project, run the SQL above, copy URL + service role key
3. Fill in `.env.local` with all keys

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add Clerk and Supabase setup instructions"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Run build to check for TypeScript errors**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Test full flow**

1. Open http://localhost:3000
2. Verify "Sign In" button appears top-right
3. Search for `AAPL` — verify data loads via `/api/*` routes
4. Sign in with Clerk
5. Verify avatar appears, "Watchlist" link appears
6. Add AAPL to watchlist via bookmark button
7. Navigate to `/watchlist` — verify AAPL card appears with live price
8. Click AAPL card — verify it navigates to `/?ticker=AAPL` and auto-searches
9. Remove from watchlist — verify card disappears
10. Sign out — verify watchlist link disappears

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete fullstack upgrade with auth, API routes, and watchlist"
```
