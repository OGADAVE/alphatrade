"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";
import type { Market } from "@/lib/types";

// Deliberately longer than the API route's 15s cache TTL, so most polls
// land on a cached value rather than racing a fresh upstream fetch.
const POLL_MS = 20_000;

export default function LivePrice({ symbol, market }: { symbol: string; market: Market }) {
  const [price, setPrice] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(
          `/api/market/price?symbol=${encodeURIComponent(symbol)}&market=${market}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("bad response");
        const data = (await res.json()) as { price?: number };
        if (!cancelled && typeof data.price === "number") {
          setPrice(data.price);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [symbol, market]);

  return (
    <span className="inline-flex items-center gap-1.5 font-data">
      {price != null ? formatPrice(price) : failed ? "—" : "…"}
      <span
        aria-label="Live price"
        title="Updates automatically — not a static trade level"
        className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full"
        style={{ background: "var(--long)" }}
      />
    </span>
  );
}