import { NextRequest, NextResponse } from "next/server";
import { getCurrentPrice } from "@/lib/market-data";
import type { Market } from "@/lib/types";

// Deliberately NOT written to Firestore — current price is market state,
// not a property of the trade (entry/SL/TP are). This endpoint exists so
// the UI can show fresher-than-the-5-minute-tracking-cycle prices without
// the browser calling Binance/Finnhub directly (which would need the API
// keys client-side).
//
// In-memory cache, keyed by symbol+market: every page view polling this
// endpoint within the TTL window gets the same cached value instead of
// triggering a new upstream call. This is what keeps real traffic from
// turning into one Binance/Finnhub call per visitor per poll.
//
// Known limitation: this cache lives in one serverless instance's memory.
// Netlify may run several instances concurrently under real load, so the
// *actual* upstream call rate can be somewhat higher than "one cache per
// TTL window" implies — still a large, predictable reduction versus no
// caching at all, but not a hard per-symbol ceiling. If traffic grows
// enough for this to matter, move the cache to Firestore or an external
// store (e.g. Upstash Redis) instead of module-level memory.
const CACHE_TTL_MS = 15_000;
const priceCache = new Map<string, { price: number; cachedAt: number }>();

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  const market = request.nextUrl.searchParams.get("market") as Market | null;

  if (!symbol || (market !== "crypto" && market !== "forex")) {
    return NextResponse.json({ error: "symbol and market=crypto|forex are required." }, { status: 400 });
  }

  const key = `${market}:${symbol}`;
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json({ price: cached.price, cached: true });
  }

  const price = await getCurrentPrice(symbol, market);
  if (price == null) {
    // Serve a stale cached value rather than nothing, if we have one —
    // a brief upstream hiccup shouldn't blank out the UI.
    if (cached) return NextResponse.json({ price: cached.price, cached: true, stale: true });
    return NextResponse.json({ error: "Price unavailable." }, { status: 502 });
  }

  priceCache.set(key, { price, cachedAt: Date.now() });
  return NextResponse.json({ price, cached: false });
}