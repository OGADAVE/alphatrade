import SignalCard from "@/components/SignalCard";
import { getSignals, getStrategies } from "@/lib/signals-data";
import { getServerUser } from "@/lib/get-server-user";
import { getEntitlement, applyEntitlementToAll } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export default async function CryptoSignalsPage() {
  const [signals, strategies, user] = await Promise.all([getSignals(), getStrategies(), getServerUser()]);
  const entitlement = await getEntitlement(user?.uid ?? null);
  const cryptoSignals = applyEntitlementToAll(signals.filter((s) => s.market === "crypto"), entitlement);
  const strategyName = (id: string) => strategies.find((s) => s.id === id)?.name;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Crypto signals</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        Live and recent signals across supported crypto pairs.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {cryptoSignals.map((s) => (
          <SignalCard key={s.id} signal={s} strategyName={strategyName(s.strategyId)} />
        ))}
      </div>
    </div>
  );
}
