// Run once against a fresh Firebase project:
//   node scripts/seed.mjs
// Requires the same FIREBASE_ADMIN_* env vars as the app (loads .env.local).
import { config } from "dotenv";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

config({ path: ".env.local" });

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Missing FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY in .env.local",
  );
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

const strategies = [
  {
    id: "strategy_alpha_momentum",
    name: "Alpha Momentum",
    description: "Trend-following momentum strategy across major crypto pairs.",
    market: "crypto",
    timeframes: ["15m", "1h"],
    instruments: ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
    engine: "Jesse",
    riskLevel: "medium",
    active: true,
  },
  {
    id: "strategy_fx_momentum",
    name: "FX Momentum",
    description: "Session-based breakout strategy for major forex pairs.",
    market: "forex",
    timeframes: ["30m", "4h"],
    instruments: ["EUR/USD", "GBP/USD", "USD/JPY"],
    engine: "Jesse",
    riskLevel: "medium",
    active: true,
  },
];

const signalSources = [
  {
    id: "tradingview",
    name: "TradingView Webhooks",
    type: "tradingview",
    authorized: true,
    active: true,
    connectionDetails: "POST /api/webhooks/tradingview?secret=...",
  },
  {
    id: "engine_alpha_momentum",
    name: "Alpha Momentum (EMA20/50 crossover)",
    type: "internal_algorithm",
    authorized: true,
    active: true,
    connectionDetails: "Runs in-process via /api/cron/generate-signals — no external auth needed.",
  },
  {
    id: "engine_fx_momentum",
    name: "FX Momentum (EMA20/50 crossover)",
    type: "internal_algorithm",
    authorized: true,
    active: true,
    connectionDetails: "Runs in-process via /api/cron/generate-signals — requires TWELVE_DATA_API_KEY.",
  },
];

async function seed() {
  for (const { id, ...data } of strategies) {
    await db.collection("strategies").doc(id).set(data, { merge: true });
    console.log(`Seeded strategy: ${id}`);
  }
  for (const { id, ...data } of signalSources) {
    await db.collection("signal_sources").doc(id).set(data, { merge: true });
    console.log(`Seeded signal source: ${id}`);
  }
  console.log("Done. Signals collection is left empty — ingest via the webhook routes or the admin panel.");
}

seed().then(() => process.exit(0));
