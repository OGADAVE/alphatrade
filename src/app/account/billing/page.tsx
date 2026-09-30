import Link from "next/link";
import { getServerUser } from "@/lib/get-server-user";
import { getEntitlement } from "@/lib/entitlements";
import UpgradeButton from "@/components/UpgradeButton";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = await getServerUser();

  if (!user) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Sign in to manage billing</h1>
        <Link href="/login" className="mt-4 inline-block text-sm" style={{ color: "var(--accent)" }}>
          Sign in →
        </Link>
      </div>
    );
  }

  const entitlement = await getEntitlement(user.uid);

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {user.email}
        </p>
      </div>

      <div
        className="rounded-md border p-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Current plan</p>
        <p
          className="mt-1 text-lg font-semibold"
          style={{ color: entitlement.plan === "PREMIUM" ? "var(--long)" : "var(--text-primary)" }}
        >
          {entitlement.plan}
        </p>
      </div>

      {entitlement.plan === "FREE" ? (
        <div>
          <p className="mb-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            Premium unlocks full entry/stop-loss/take-profit details on
            premium-flagged signals, on top of everything free signals
            already show.
          </p>
          <UpgradeButton />
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Manage or cancel your subscription from your Paystack receipt
          email — a self-service cancellation link isn&apos;t built into this
          page yet.
        </p>
      )}
    </div>
  );
}
