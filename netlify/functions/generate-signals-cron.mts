import type { Config } from "@netlify/functions";

async function generateSignalsCron() {
  const siteUrl = process.env.URL;
  const secret = process.env.CRON_SECRET;

  if (!siteUrl || !secret) {
    console.error("Missing URL or CRON_SECRET — skipping this generation run.");
    return;
  }

  try {
    const res = await fetch(`${siteUrl}/api/cron/generate-signals?secret=${secret}`);
    const body = await res.text();
    if (!res.ok) {
      console.error(`Signal generation run failed (${res.status}): ${body}`);
    } else {
      console.log(`Signal generation run ok: ${body}`);
    }
  } catch (err) {
    console.error("Signal generation request failed:", err);
  }
}

export default generateSignalsCron;

export const config: Config = {
  // Matches the alpha-momentum engine's 15m timeframe — no point checking
  // more often than a new candle can close.
  schedule: "*/15 * * * *",
};
