import Link from "next/link";
import { verifyTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export default async function BillingCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const { reference, trxref } = await searchParams;
  const ref = reference ?? trxref;

  let status: string | null = null;
  if (ref) {
    try {
      const result = await verifyTransaction(ref);
      status = result.status;
    } catch {
      status = null;
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold">
        {status === "success" ? "Payment received" : "Checking your payment…"}
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
        {status === "success"
          ? "Your Premium access activates as soon as Paystack's confirmation reaches us — usually within a few seconds, sometimes up to a couple of minutes."
          : "We couldn't confirm this transaction yet. If you completed checkout, your access will still activate once Paystack's confirmation arrives — check back shortly."}
      </p>
      <Link href="/account/billing" className="mt-4 inline-block text-sm" style={{ color: "var(--accent)" }}>
        View billing status →
      </Link>
    </div>
  );
}
