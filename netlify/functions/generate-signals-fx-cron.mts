import type { Config } from "@netlify/functions";

// Forex candle generation, via Twelve Data only (free tier: 800 req/day,
// 8/min). Netlify scheduled functions are capped at 30 seconds — not
// enough time to pace 10 sequential calls far enough apart to respect the
// 8/min ceiling (that would take ~80s). So instead of looping through all
// 10 pairs in one run, this runs every 3 minutes and handles exactly ONE
// pair per invocation, round-robining through all 10 across each
// 30-minute window. Same daily total (480 credits/day) as checking all 10
// every 30 minutes — just spread out instead of bursted, which is what
// actually keeps it under the per-minute cap.
//
// This list must stay in sync with fx-momentum-engine.ts's `instruments`
// array — Netlify Functions bundle independently from the Next.js app, so
// it can't be imported directly.
const FX_INSTRUMENTS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD",
  "USD/CHF", "NZD/USD", "EUR/GBP", "EUR/JPY", "GBP/JPY",
];

function currentSymbol(): string {
  const minute = new Date().getUTCMinutes();
  const index = Math.floor((minute % 30) / 3);
  return FX_INSTRUMENTS[index];
}

async function generateFxSignalsCron() {
  const siteUrl = process.env.URL;
  const secret = process.env.CRON_SECRET;

  if (!siteUrl || !secret) {
    console.error("Missing URL or CRON_SECRET — skipping this generation run.");
    return;
  }

  const symbol = currentSymbol();

  try {
    const res = await fetch(
      `${siteUrl}/api/cron/generate-signals?market=forex&symbol=${encodeURIComponent(symbol)}&secret=${secret}`,
    );
    const body = await res.text();
    if (!res.ok) {
      console.error(`FX signal generation run (${symbol}) failed (${res.status}): ${body}`);
    } else {
      console.log(`FX signal generation run (${symbol}) ok: ${body}`);
    }
  } catch (err) {
    console.error(`FX signal generation request failed (${symbol}):`, err);
  }
}

export default generateFxSignalsCron;

export const config: Config = {
  schedule: "*/3 * * * *",
};
