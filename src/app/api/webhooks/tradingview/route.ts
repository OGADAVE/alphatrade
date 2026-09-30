import { NextRequest, NextResponse } from "next/server";
import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { normalizeSignal, validateNormalizedSignal, isDuplicateSignal } from "@/lib/signal-pipeline";
import type { RawSignalInput } from "@/lib/signal-pipeline";
import type { Signal } from "@/lib/types";

const SOURCE_ID = "tradingview";

/**
 * TradingView sends whatever JSON body you configure in the alert message.
 * We require a shared secret in the query string (?secret=...) since
 * TradingView alerts can't send custom headers. Set TRADINGVIEW_WEBHOOK_SECRET
 * and use it as the value in your alert's webhook URL.
 */
export async function POST(request: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Server is not yet configured with Firebase Admin credentials." },
      { status: 503 },
    );
  }

  const secret = request.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.TRADINGVIEW_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Invalid or missing webhook secret." }, { status: 401 });
  }

  let body: RawSignalInput;
  try {
    body = (await request.json()) as RawSignalInput;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const strategyId = typeof body === "object" && "strategyId" in body ? String((body as Record<string, unknown>).strategyId) : SOURCE_ID;

  const normalized = normalizeSignal(body, { sourceId: SOURCE_ID, strategyId });
  const validation = validateNormalizedSignal(normalized);
  if (!validation.valid) {
    return NextResponse.json({ error: "Signal failed validation.", details: validation.errors }, { status: 422 });
  }

  const db = adminDb();

  // Duplicate check against currently-open signals from this source.
  const openSnap = await db
    .collection("signals")
    .where("sourceId", "==", SOURCE_ID)
    .where("status", "in", ["PENDING", "ACTIVE", "TP1_HIT", "TP2_HIT", "TP3_HIT"])
    .get();
  const openSignals = openSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Signal);

  if (isDuplicateSignal(normalized, openSignals)) {
    return NextResponse.json({ error: "Duplicate signal — an equivalent open signal already exists." }, { status: 409 });
  }

  const { id: _discard, ...signalData } = normalized;
  void _discard;
  const docRef = await db.collection("signals").add(signalData);

  return NextResponse.json({ ok: true, signalId: docRef.id }, { status: 201 });
}
