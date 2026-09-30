import { NextRequest, NextResponse } from "next/server";
import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { normalizeSignal, validateNormalizedSignal, isDuplicateSignal } from "@/lib/signal-pipeline";
import type { RawSignalInput } from "@/lib/signal-pipeline";
import type { Signal, SignalSource } from "@/lib/types";

/**
 * Route: POST /api/webhooks/provider/[id]
 * [id] is the Firestore doc id of the signal_sources entry for this
 * provider. The provider must send its API key in the
 * `x-provider-key` header, which must match the source's stored key.
 *
 * This route deliberately does its own authorization + active-status check
 * per source (spec section 7) rather than trusting a single shared secret —
 * each provider can be revoked independently by flipping `active: false`
 * or `authorized: false` on its signal_sources doc, with no deploy needed.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Server is not yet configured with Firebase Admin credentials." },
      { status: 503 },
    );
  }

  const { id: sourceId } = await params;
  const db = adminDb();

  const sourceDoc = await db.collection("signal_sources").doc(sourceId).get();
  if (!sourceDoc.exists) {
    return NextResponse.json({ error: "Unknown signal source." }, { status: 404 });
  }
  const source = sourceDoc.data() as SignalSource & { apiKey?: string };

  if (!source.active || !source.authorized) {
    return NextResponse.json({ error: "This source is not currently active/authorized." }, { status: 403 });
  }

  const providedKey = request.headers.get("x-provider-key");
  if (!providedKey || providedKey !== source.apiKey) {
    return NextResponse.json({ error: "Invalid provider key." }, { status: 401 });
  }

  let body: RawSignalInput;
  try {
    body = (await request.json()) as RawSignalInput;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const strategyId =
    typeof body === "object" && "strategyId" in body
      ? String((body as Record<string, unknown>).strategyId)
      : sourceId;

  const normalized = normalizeSignal(body, { sourceId, strategyId });
  const validation = validateNormalizedSignal(normalized);
  if (!validation.valid) {
    return NextResponse.json({ error: "Signal failed validation.", details: validation.errors }, { status: 422 });
  }

  const openSnap = await db
    .collection("signals")
    .where("sourceId", "==", sourceId)
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
