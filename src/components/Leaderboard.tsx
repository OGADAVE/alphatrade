import type { Strategy, StrategyPerformance } from "@/lib/types";
import FollowButton from "./FollowButton";
import { formatR } from "@/lib/format";

function alphaScoreColor(score: number): string {
  if (score >= 70) return "var(--long)";
  if (score >= 45) return "var(--pending)";
  return "var(--short)";
}

export default function Leaderboard({
  strategies,
  performance,
}: {
  strategies: Strategy[];
  performance: StrategyPerformance[];
}) {
  const rows = performance
    .map((p) => ({ perf: p, strategy: strategies.find((s) => s.id === p.strategyId) }))
    .filter((r) => r.strategy)
    .sort((a, b) => {
      if (a.perf.totalSignals === 0 && b.perf.totalSignals === 0) return 0;
      if (a.perf.totalSignals === 0) return 1;
      if (b.perf.totalSignals === 0) return -1;
      return b.perf.alphaScore - a.perf.alphaScore;
    });

  return (
    <div
      className="overflow-hidden rounded-md border"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: "var(--text-tertiary)" }}>
              <th className="px-4 py-2.5 font-normal">Rank</th>
              <th className="px-4 py-2.5 font-normal">Strategy</th>
              <th className="px-4 py-2.5 font-normal">AlphaScore</th>
              <th className="px-4 py-2.5 font-normal">Signals</th>
              <th className="px-4 py-2.5 font-normal">Win rate</th>
              <th className="px-4 py-2.5 font-normal">Avg R</th>
              <th className="px-4 py-2.5 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ perf, strategy }, i) => {
              const unranked = perf.totalSignals === 0;
              return (
                <tr key={perf.strategyId} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-2.5 font-data" style={{ color: "var(--text-tertiary)" }}>
                    {unranked ? "—" : `#${i + 1}`}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{strategy!.name}</td>
                  <td className="px-4 py-2.5">
                    {unranked ? (
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        Not yet ranked
                      </span>
                    ) : (
                      <span
                        className="font-data rounded-sm px-2 py-0.5 text-xs font-semibold"
                        style={{ color: alphaScoreColor(perf.alphaScore), background: "var(--surface-hover)" }}
                        title={`Win rate ${perf.alphaScoreBreakdown.winRateScore} · R:R ${perf.alphaScoreBreakdown.rewardRiskScore} · Consistency ${perf.alphaScoreBreakdown.consistencyScore} · Confidence ${perf.alphaScoreBreakdown.confidenceScore}`}
                      >
                        {perf.alphaScore}
                      </span>
                    )}
                  </td>
                  <td className="font-data px-4 py-2.5">{perf.totalSignals}</td>
                  <td className="font-data px-4 py-2.5 font-semibold">
                    {unranked ? "—" : `${perf.winRate.toFixed(1)}%`}
                  </td>
                  <td
                    className="font-data px-4 py-2.5"
                    style={{ color: perf.avgRMultiple >= 0 ? "var(--long)" : "var(--short)" }}
                  >
                    {unranked ? "—" : formatR(perf.avgRMultiple)}
                  </td>
                  <td className="px-4 py-2.5">
                    <FollowButton strategyId={perf.strategyId} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
