import { NextRequest, NextResponse } from "next/server";
import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { getCandles } from "@/lib/market-data";
import { normalizeSignal, validateNormalizedSignal, isDuplicateSignal } from "@/lib/signal-pipeline";
import { strategyEngines } from "@/lib/engines/registry";
import type { Market, Signal } from "@/lib/types";

const OPEN_STATUSES = ["PENDING", "ACTIVE", "TP1_HIT", "TP2_HIT", "TP3_HIT"];

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return request.nextUrl.searchParams.get("secret") === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Firebase Admin is not configured." }, { status: 503 });
  }

  const marketFilter = request.nextUrl.searchParams.get("market") as Market | null;
  const symbolFilter = request.nextUrl.searchParams.get("symbol");
  const engines = marketFilter ? strategyEngines.filter((e) => e.market === marketFilter) : strategyEngines;

  const db = adminDb();
  let created = 0;
  const errors: string[] = [];

  for (const engine of engines) {
    // Open signals from THIS engine only — duplicate detection is scoped
    // per-source, same as the external webhooks.
    const openSnap = await db
      .collection("signals")
      .where("sourceId", "==", engine.id)
      .where("status", "in", OPEN_STATUSES)
      .get();
    const openSignals = openSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Signal);

    const instruments = symbolFilter ? engine.instruments.filter((s) => s === symbolFilter) : engine.instruments;

    for (const symbol of instruments) {
      try {
        const candles = await getCandles(symbol, engine.market, engine.timeframe, 150);
        if (candles.length === 0) {
          errors.push(`${engine.id}/${symbol}: no candle data returned.`);
          continue;
        }

        const inputs = await engine.generateSignals({
          symbol,
          market: engine.market,
          timeframe: engine.timeframe,
          candles,
        });

        for (const input of inputs) {
          const normalized = normalizeSignal(input, { sourceId: engine.id, strategyId: engine.strategyId });
          const validation = validateNormalizedSignal(normalized);
          if (!validation.valid) {
            errors.push(`${engine.id}/${symbol}: ${validation.errors.join(" ")}`);
            continue;
          }
          if (isDuplicateSignal(normalized, openSignals)) continue;

          const { id: _discard, ...signalData } = normalized;
          void _discard;
          await db.collection("signals").add(signalData);
          created += 1;
          openSignals.push(normalized); // avoid a second near-identical write later in this same run
        }
      } catch (err) {
        errors.push(`${engine.id}/${symbol}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return NextResponse.json({ ok: true, created, errors });
}
