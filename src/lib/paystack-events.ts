export interface PaystackEvent {
  event: string;
  data: {
    customer?: { email?: string; customer_code?: string };
    plan?: { plan_code?: string };
    subscription_code?: string;
    subscription?: { subscription_code?: string };
    next_payment_date?: string | null;
    metadata?: { uid?: string };
  };
}

export type EntitlementChange =
  | { action: "ignore"; reason: string }
  | { action: "activate"; currentPeriodEnd: string }
  | { action: "deactivate" };

// charge.success is deliberately the broadest activating event (it covers
// the first payment AND every renewal), so the "is this ours?" check below
// is what keeps it safe. invoice.update is intentionally NOT activating:
// Paystack sends it for failed attempts too.
const ACTIVATING = new Set(["subscription.create", "charge.success"]);
const DEACTIVATING = new Set(["subscription.disable", "subscription.not_renew", "invoice.payment_failed"]);

// Extra days of access past the expected next payment, so a renewal
// webhook arriving a few hours late doesn't lock out a paying user.
const GRACE_DAYS = 5;
const DAY_MS = 86_400_000;

/**
 * Decides what a verified Paystack event means for AlphaTrade entitlement.
 *
 * An event only counts if it's verifiably ours: either it carries the
 * `metadata.uid` that only our own /api/billing/initialize sets, or it's
 * tied to our configured Premium plan code. Anything else on the Paystack
 * account (other products/ventures) is ignored, so unrelated charges or
 * cancellations can never grant or revoke Premium.
 *
 * Activation always yields a bounded `currentPeriodEnd` — renewal
 * `charge.success` events carry no next_payment_date, so we fall back to
 * now + one billing period. Each successful renewal pushes it forward; if
 * renewals silently stop, access lapses on its own instead of lasting forever.
 */
export function resolveEntitlementChange(
  event: PaystackEvent,
  opts: { planCode?: string; periodDays: number },
  nowMs: number = Date.now(),
): EntitlementChange {
  const hasOurMetadata = Boolean(event.data.metadata?.uid);
  const planMatches = Boolean(opts.planCode) && event.data.plan?.plan_code === opts.planCode;

  if (!hasOurMetadata && !planMatches) {
    return { action: "ignore", reason: "Not an AlphaTrade Premium event." };
  }

  if (ACTIVATING.has(event.event)) {
    const fallbackEnd = nowMs + opts.periodDays * DAY_MS;
    const parsed = event.data.next_payment_date ? new Date(event.data.next_payment_date).getTime() : NaN;
    const base = Number.isFinite(parsed) ? parsed : fallbackEnd;
    return { action: "activate", currentPeriodEnd: new Date(base + GRACE_DAYS * DAY_MS).toISOString() };
  }

  if (DEACTIVATING.has(event.event)) {
    return { action: "deactivate" };
  }

  return { action: "ignore", reason: `Unhandled event type: ${event.event}` };
}
