import type { Config } from "@netlify/functions";

// Crypto only — Binance is free/unlimited, so this stays on the engine's
// native 15m timeframe. Forex runs on its own, slower schedule (see
// generate-signals-fx-cron.mts) because Twelve Data/Finnhub are rate-limited.
async function generateCryptoSignalsCron() {
  const siteUrl = process.env.URL;
  const secret = process.env.CRON_SECRET;

  if (!siteUrl || !secret) {
    console.error("Missing URL or CRON_SECRET — skipping this generation run.");
    return;
  }

  try {
    const res = await fetch(`${siteUrl}/api/cron/generate-signals?market=crypto&secret=${secret}`);
    const body = await res.text();
    if (!res.ok) {
      console.error(`Crypto signal generation run failed (${res.status}): ${body}`);
    } else {
      console.log(`Crypto signal generation run ok: ${body}`);
    }
  } catch (err) {
    console.error("Crypto signal generation request failed:", err);
  }
}

export default generateCryptoSignalsCron;

export const config: Config = {
  schedule: "*/15 * * * *",
};
