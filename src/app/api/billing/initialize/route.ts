import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/get-server-user";
import { initializeTransaction } from "@/lib/paystack";

const PREMIUM_AMOUNT_KOBO = Number(process.env.PAYSTACK_PREMIUM_AMOUNT_KOBO ?? 500000); // ₦5,000/mo default

export async function POST() {
  const user = await getServerUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const appUrl = process.env.APP_URL ?? process.env.URL;
  if (!appUrl) {
    return NextResponse.json({ error: "APP_URL is not configured." }, { status: 503 });
  }

  try {
    const result = await initializeTransaction({
      email: user.email,
      amountKobo: PREMIUM_AMOUNT_KOBO,
      metadata: { uid: user.uid },
      callbackUrl: `${appUrl}/billing/callback`,
      planCode: process.env.PAYSTACK_PREMIUM_PLAN_CODE || undefined,
    });
    return NextResponse.json({ authorizationUrl: result.authorizationUrl });
  } catch (err) {
    console.error("Paystack initialize failed:", err);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
  }
}
