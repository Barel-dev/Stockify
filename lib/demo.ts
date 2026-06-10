// Seeded demo data shown to signed-out visitors on /portfolio and /watchlist.
// Quotes are still fetched live, so the demo shows real market P&L.

export type DemoHolding = {
  id: string;
  symbol: string;
  shares: number;
  buy_price: number;
  company_name: string;
  created_at: string;
};

export type DemoWatchlistItem = {
  id: string;
  symbol: string;
  company_name: string;
  added_at: string;
};

const NOW = new Date().toISOString();

export const DEMO_PORTFOLIO: DemoHolding[] = [
  { id: "demo-1", symbol: "AAPL", shares: 25, buy_price: 232.5, company_name: "Apple Inc.", created_at: NOW },
  { id: "demo-2", symbol: "NVDA", shares: 40, buy_price: 121.4, company_name: "NVIDIA Corporation", created_at: NOW },
  { id: "demo-3", symbol: "MSFT", shares: 12, buy_price: 415.0, company_name: "Microsoft Corporation", created_at: NOW },
  { id: "demo-4", symbol: "AMZN", shares: 18, buy_price: 178.25, company_name: "Amazon.com Inc.", created_at: NOW },
  { id: "demo-5", symbol: "META", shares: 8, buy_price: 540.0, company_name: "Meta Platforms Inc.", created_at: NOW },
  { id: "demo-6", symbol: "BINANCE:BTCUSDT", shares: 0.15, buy_price: 62000, company_name: "Bitcoin", created_at: NOW },
];

export const DEMO_WATCHLIST: DemoWatchlistItem[] = [
  { id: "demo-w1", symbol: "AAPL", company_name: "Apple Inc.", added_at: NOW },
  { id: "demo-w2", symbol: "NVDA", company_name: "NVIDIA Corporation", added_at: NOW },
  { id: "demo-w3", symbol: "TSLA", company_name: "Tesla Inc.", added_at: NOW },
  { id: "demo-w4", symbol: "AMD", company_name: "Advanced Micro Devices", added_at: NOW },
  { id: "demo-w5", symbol: "AMZN", company_name: "Amazon.com Inc.", added_at: NOW },
  { id: "demo-w6", symbol: "SPY", company_name: "SPDR S&P 500 ETF", added_at: NOW },
];
