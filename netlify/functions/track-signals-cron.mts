import type { Config } from "@netlify/functions";

// Covers both crypto (Binance, free/unlimited) and forex (Finnhub, ~60
// req/min free tier, no stated daily cap) tracking in one run. Neither
// provider needs the round-robin treatment generation requires — Finnhub
// handles a full burst of up to 10 open-position price checks in a couple
// of seconds, comfortably within both its own rate limit and Netlify's
// 30s scheduled-function ceiling. Twelve Data is not used for tracking at
// all (see "FX data architecture" in README.md) — only for FX candles.
async function trackSignalsCron() {
  const siteUrl = process.env.URL;
  const secret = process.env.CRON_SECRET;

  if (!siteUrl || !secret) {
    console.error("Missing URL or CRON_SECRET — skipping this tracking run.");
    return;
  }

  try {
    const res = await fetch(`${siteUrl}/api/cron/track-signals?secret=${secret}`);
    const body = await res.text();
    if (!res.ok) {
      console.error(`Tracking run failed (${res.status}): ${body}`);
    } else {
      console.log(`Tracking run ok: ${body}`);
    }
  } catch (err) {
    console.error("Tracking run request failed:", err);
  }
}

export default trackSignalsCron;

export const config: Config = {
  schedule: "*/5 * * * *",
};
