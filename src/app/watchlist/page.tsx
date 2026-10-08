import Link from "next/link";
import { getServerUser } from "@/lib/get-server-user";
import { getSignals, getStrategies, getStrategyPerformance } from "@/lib/signals-data";
import { getEntitlement, applyEntitlementToAll } from "@/lib/entitlements";
import SignalCard from "@/components/SignalCard";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const serverUser = await getServerUser();

  if (!serverUser) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Sign in to see your watchlist</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          Favorites, followed strategies, and watchlisted instruments are
          saved to your account.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm" style={{ color: "var(--accent)" }}>
          Sign in →
        </Link>
      </div>
    );
  }

  const [signals, strategies, performance] = await Promise.all([
    getSignals(),
    getStrategies(),
    getStrategyPerformance(),
  ]);
  const strategyName = (id: string) => strategies.find((s) => s.id === id)?.name;
  const entitlement = await getEntitlement(serverUser.uid);

  // Drafts (PENDING) are admin-only — defensive filter, since a user
  // can't normally favorite/watch a signal they were never shown one.
  const favoritedSignals = applyEntitlementToAll(
    signals.filter((s) => serverUser.favoriteSignalIds.includes(s.id) && s.status !== "PENDING"),
    entitlement,
  );
  const watchlistSignals = applyEntitlementToAll(
    signals.filter(
      (s) =>
        serverUser.watchlist.includes(s.symbol) &&
        !serverUser.favoriteSignalIds.includes(s.id) &&
        s.status !== "PENDING",
    ),
    entitlement,
  );
  const followedStrategies = strategies
    .filter((s) => serverUser.followedStrategyIds.includes(s.id))
    .map((s) => ({ strategy: s, perf: performance.find((p) => p.strategyId === s.id) }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Your watchlist</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Favorited signals, watchlisted instruments, and followed strategies.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Favorited signals</h2>
        {favoritedSignals.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Tap the star on any signal to favorite it.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {favoritedSignals.map((s) => (
              <SignalCard key={s.id} signal={s} strategyName={strategyName(s.strategyId)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Watchlisted instruments</h2>
        {serverUser.watchlist.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Tap &quot;Watch&quot; on any signal card to track its instrument here.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {serverUser.watchlist.map((symbol) => (
                <span
                  key={symbol}
                  className="font-data rounded-sm border px-2 py-0.5 text-xs"
                  style={{ borderColor: "var(--border-strong)", color: "var(--text-secondary)" }}
                >
                  {symbol}
                </span>
              ))}
            </div>
            {watchlistSignals.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                No current signals for your watchlisted instruments.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {watchlistSignals.map((s) => (
                  <SignalCard key={s.id} signal={s} strategyName={strategyName(s.strategyId)} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Followed strategies</h2>
        {followedStrategies.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Follow a strategy from the leaderboard on the home page.
          </p>
        ) : (
          <div className="space-y-2">
            {followedStrategies.map(({ strategy, perf }) => (
              <div
                key={strategy.id}
                className="flex items-center justify-between rounded-md border p-3"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div>
                  <p className="text-sm font-medium">{strategy.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {strategy.market} · {strategy.riskLevel} risk
                  </p>
                </div>
                <span className="font-data text-sm font-semibold">
                  {perf && perf.totalSignals > 0 ? `AlphaScore ${perf.alphaScore}` : "Not yet ranked"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}