import Link from "next/link";
import StatTile from "@/components/StatTile";
import SignalCard from "@/components/SignalCard";
import Leaderboard from "@/components/Leaderboard";
import { getSignals, getStrategies, getStrategyPerformance } from "@/lib/signals-data";
import { getServerUser } from "@/lib/get-server-user";
import { getEntitlement, applyEntitlementToAll } from "@/lib/entitlements";

// Live signal data changes constantly — never statically cache this page.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [rawSignals, strategies, performance, user] = await Promise.all([
    getSignals(),
    getStrategies(),
    getStrategyPerformance(),
    getServerUser(),
  ]);
  // Drafts (PENDING) are admin-only — see /admin/signals — and must never
  // reach a public page.
  const signals = rawSignals.filter((s) => s.status !== "PENDING");
  const entitlement = await getEntitlement(user?.uid ?? null);
  const viewSignals = applyEntitlementToAll(signals, entitlement);
  const strategyName = (id: string) => strategies.find((s) => s.id === id)?.name;

  const activeSignals = signals.filter(
    (s) => !["CLOSED", "CANCELLED", "EXPIRED", "FULL_TP", "SL_HIT"].includes(s.status),
  );
  const closed = signals.filter((s) => s.result);
  const wins = closed.filter((s) => s.result === "WIN").length;
  const winRate = closed.length ? ((wins / closed.length) * 100).toFixed(1) : "—";

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Automated signals. No manual guesswork.
        </h1>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--text-secondary)" }}>
          AlphaTrade is your #1 Signals provider — it ingests, validates, and tracks crypto and forex
          trades from multiple authorized sources — then tells you exactly
          when TP or SL hits, automatically.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Active signals" value={String(activeSignals.length)} />
        <StatTile label="Crypto" value={String(signals.filter((s) => s.market === "crypto").length)} />
        <StatTile label="Forex" value={String(signals.filter((s) => s.market === "forex").length)} />
        <StatTile label="Win rate" value={`${winRate}%`} tone="long" />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Live signals</h2>
          <div className="flex gap-3 text-sm">
            <Link href="/crypto" style={{ color: "var(--accent)" }}>Crypto →</Link>
            <Link href="/forex" style={{ color: "var(--accent)" }}>Forex →</Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {viewSignals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} strategyName={strategyName(signal.strategyId)} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Top strategies</h2>
        <Leaderboard strategies={strategies} performance={performance} />
      </section>

      <section
        className="rounded-md border p-4 text-xs"
        style={{ borderColor: "var(--border)", color: "var(--text-tertiary)" }}
      >
        Trading cryptocurrencies and forex carries substantial risk. Signals
        are informational and educational, not financial advice. Past
        performance does not guarantee future results.
      </section>
    </div>
  );
}