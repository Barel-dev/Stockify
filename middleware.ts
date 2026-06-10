import { clerkMiddleware } from "@clerk/nextjs/server";

// No middleware-protected pages: /watchlist and /portfolio render a live demo
// for signed-out visitors, and every user-data API route verifies auth()
// in-handler, so data access never depends on this middleware.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|api/quote|api/search|api/candles|api/company|api/news|api/earnings|api/recommendations|api/metrics|api/price-target|sw\\.js|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
