import { getStrategies, getStrategyPerformance } from "@/lib/signals-data";
import { createStrategy, toggleStrategyActive } from "./actions";

export const dynamic = "force-dynamic";

export default async function StrategiesPage() {
  const [strategies, performance] = await Promise.all([getStrategies(), getStrategyPerformance()]);
  const perfFor = (id: string) => performance.find((p) => p.strategyId === id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Strategies</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Every signal&apos;s <span className="font-data">strategyId</span> must match one of these.
        </p>
      </div>

      <div
        className="overflow-hidden rounded-md border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: "var(--text-tertiary)" }}>
              <th className="px-4 py-2.5 font-normal">Name</th>
              <th className="px-4 py-2.5 font-normal">Market</th>
              <th className="px-4 py-2.5 font-normal">Risk</th>
              <th className="px-4 py-2.5 font-normal">AlphaScore</th>
              <th className="px-4 py-2.5 font-normal">Active</th>
            </tr>
          </thead>
          <tbody>
            {strategies.map((strategy) => {
              const perf = perfFor(strategy.id);
              return (
                <tr key={strategy.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-2.5 font-medium">{strategy.name}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {strategy.market}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {strategy.riskLevel}
                  </td>
                  <td className="font-data px-4 py-2.5">
                    {perf && perf.totalSignals > 0 ? perf.alphaScore : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <form action={toggleStrategyActive.bind(null, strategy.id, !strategy.active)}>
                      <button
                        type="submit"
                        className="rounded-sm border px-2 py-0.5 text-xs"
                        style={{
                          color: strategy.active ? "var(--long)" : "var(--text-tertiary)",
                          borderColor: strategy.active ? "var(--long-dim)" : "var(--border-strong)",
                        }}
                      >
                        {strategy.active ? "Active" : "Inactive"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        className="rounded-md border p-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h2 className="mb-3 text-sm font-semibold">Add a strategy</h2>
        <form action={createStrategy} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>Name</label>
            <input
              name="name"
              required
              className="mt-1 rounded-md border px-3 py-1.5 text-sm"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
            />
          </div>
          <div>
            <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>Market</label>
            <select
              name="market"
              className="mt-1 rounded-md border px-3 py-1.5 text-sm"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
            >
              <option value="crypto">Crypto</option>
              <option value="forex">Forex</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div>
            <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>Risk level</label>
            <select
              name="riskLevel"
              className="mt-1 rounded-md border px-3 py-1.5 text-sm"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>
              Instruments (comma-separated)
            </label>
            <input
              name="instruments"
              placeholder="BTC/USDT, ETH/USDT"
              className="mt-1 rounded-md border px-3 py-1.5 text-sm"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
            />
          </div>
          <div className="w-full">
            <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>Description</label>
            <input
              name="description"
              className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
            />
          </div>
          <button
            type="submit"
            className="rounded-md px-4 py-1.5 text-sm font-semibold"
            style={{ background: "var(--accent)", color: "#0B0F14" }}
          >
            Add strategy
          </button>
        </form>
      </div>
    </div>
  );
}
