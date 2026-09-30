import type { Config } from "@netlify/functions";

// This function's only job is to invoke the real tracking logic at
// /api/cron/track-signals on a schedule. Netlify's scheduler attaches to
// files in netlify/functions/, not directly to Next.js API routes, so this
// small wrapper is what replaces vercel.json's cron block.
async function trackSignalsCron() {
  const siteUrl = process.env.URL; // Netlify's own site URL, set at runtime
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
