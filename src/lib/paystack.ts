import "server-only";

const PAYSTACK_BASE = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured.");
  return key;
}

interface InitializeTransactionParams {
  email: string;
  amountKobo: number; // Paystack amounts are in the smallest currency unit
  metadata: Record<string, unknown>;
  callbackUrl: string;
  planCode?: string; // Paystack plan code, for recurring subscriptions
}

interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

/**
 * Starts a Paystack Checkout session. Passing `planCode` makes this a
 * subscription — Paystack handles recurring billing and fires
 * `subscription.*`/`charge.success` webhook events on its own schedule
 * from here on; AlphaTrade never has to re-charge the card itself.
 */
export async function initializeTransaction(params: InitializeTransactionParams): Promise<InitializeTransactionResult> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      metadata: params.metadata,
      callback_url: params.callbackUrl,
      ...(params.planCode ? { plan: params.planCode } : {}),
    }),
  });

  const data = (await res.json()) as {
    status: boolean;
    message: string;
    data?: { authorization_url: string; access_code: string; reference: string };
  };

  if (!res.ok || !data.status || !data.data) {
    throw new Error(`Paystack initialize failed: ${data.message ?? res.statusText}`);
  }

  return {
    authorizationUrl: data.data.authorization_url,
    accessCode: data.data.access_code,
    reference: data.data.reference,
  };
}

/**
 * Server-side verification of a transaction reference — Paystack's docs
 * recommend this as a safety net alongside webhooks (e.g. for the
 * callback page to confirm status even if the webhook is delayed). This
 * never substitutes for the webhook as the entitlement source of truth.
 */
export async function verifyTransaction(reference: string): Promise<{ status: string; email?: string }> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
    cache: "no-store",
  });
  const data = (await res.json()) as {
    status: boolean;
    data?: { status: string; customer?: { email?: string } };
  };
  if (!res.ok || !data.status || !data.data) {
    return { status: "failed" };
  }
  return { status: data.data.status, email: data.data.customer?.email };
}
