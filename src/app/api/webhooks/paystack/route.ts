import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { resolveEntitlementChange, type PaystackEvent } from "@/lib/paystack-events";

function isValidSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Firebase Admin is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  if (!isValidSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(rawBody) as PaystackEvent;
  } catch {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  const change = resolveEntitlementChange(event, {
    planCode: process.env.PAYSTACK_PREMIUM_PLAN_CODE || undefined,
    periodDays: Number(process.env.PAYSTACK_PREMIUM_PERIOD_DAYS ?? 30),
  });

  // Acknowledge (200) anything we deliberately ignore so Paystack doesn't
  // retry it indefinitely — but don't act on it.
  if (change.action === "ignore") {
    return NextResponse.json({ ok: true, ignored: change.reason });
  }

  const db = adminDb();

  // Prefer the metadata.uid we set at initialize() time; fall back to an
  // email lookup for subscription lifecycle events, which don't reliably
  // echo custom metadata.
  let uid = event.data.metadata?.uid;
  const email = event.data.customer?.email?.toLowerCase();
  if (!uid && email) {
    const snap = await db.collection("users").where("email", "==", email).limit(1).get();
    if (!snap.empty) uid = snap.docs[0].id;
  }

  if (!uid) {
    return NextResponse.json({ ok: true, ignored: "No matching AlphaTrade user." });
  }

  const now = new Date().toISOString();

  if (change.action === "activate") {
    await db
      .collection("subscriptions")
      .doc(uid)
      .set(
        {
          plan: "PREMIUM",
          status: "ACTIVE",
          paystackCustomerCode: event.data.customer?.customer_code ?? null,
          subscriptionCode: event.data.subscription_code ?? event.data.subscription?.subscription_code ?? null,
          currentPeriodEnd: change.currentPeriodEnd,
          updatedAt: now,
        },
        { merge: true },
      );
    await db.collection("users").doc(uid).set({ tier: "premium" }, { merge: true });
  } else {
    await db.collection("subscriptions").doc(uid).set({ status: "INACTIVE", updatedAt: now }, { merge: true });
    await db.collection("users").doc(uid).set({ tier: "free" }, { merge: true });
  }

  return NextResponse.json({ ok: true, action: change.action });
}
