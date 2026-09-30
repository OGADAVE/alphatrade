import Link from "next/link";
import { notFound } from "next/navigation";
import { getSignalById, getStrategyById } from "@/lib/signals-data";
import { getServerUser } from "@/lib/get-server-user";
import { getEntitlement, applyEntitlement } from "@/lib/entitlements";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function SignalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rawSignal = await getSignalById(id);
  if (!rawSignal) return notFound();

  const [strategy, user] = await Promise.all([getStrategyById(rawSignal.strategyId), getServerUser()]);
  const entitlement = await getEntitlement(user?.uid ?? null);
  const signal = applyEntitlement(rawSignal, entitlement);

  const directionColor = signal.direction === "LONG" ? "var(--long)" : "var(--short)";

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-data text-2xl font-bold">{signal.symbol}</h1>
            <span className="font-semibold" style={{ color: directionColor }}>
              {signal.direction}
            </span>
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {strategy?.name ?? "Unknown strategy"} · {signal.timeframe} timeframe · {signal.riskLevel} risk
          </p>
        </div>
        <div className="flex items-center gap-2">
          {signal.premiumOnly && (
            <span
              className="rounded-sm border px-2 py-0.5 text-xs font-medium"
              style={{ color: "var(--pending)", borderColor: "var(--pending)", background: "var(--pending-bg)" }}
            >
              Premium
            </span>
          )}
          <StatusBadge status={signal.status} />
        </div>
      </div>

      {signal.restricted && (
        <p
          className="mt-3 rounded-md border px-3 py-2 text-xs"
          style={{ borderColor: "var(--pending)", color: "var(--pending)", background: "var(--pending-bg)" }}
        >
          🔒 This is a premium signal — entry, stop-loss, and take-profit
          levels are hidden.{" "}
          <Link href="/account/billing" className="font-semibold underline">
            Upgrade to Premium
          </Link>{" "}
          to see full details.
        </p>
      )}

      <div
        className="mt-6 grid grid-cols-2 gap-4 rounded-md border p-5 sm:grid-cols-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Entry</p>
          <p className="font-data text-lg">{signal.restricted ? "🔒" : signal.entry}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Stop loss</p>
          <p className="font-data text-lg" style={{ color: "var(--short)" }}>
            {signal.restricted ? "🔒" : signal.stopLoss}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Confidence</p>
          <p className="font-data text-lg">{signal.confidence}%</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>P/L</p>
          <p
            className="font-data text-lg"
            style={{ color: (signal.pnlPercent ?? 0) >= 0 ? "var(--long)" : "var(--short)" }}
          >
            {signal.pnlPercent != null ? `${signal.pnlPercent >= 0 ? "+" : ""}${signal.pnlPercent}%` : "—"}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          Take profit targets
        </h2>
        {signal.restricted ? (
          <p
            className="rounded-md border px-4 py-3 text-sm"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-tertiary)" }}
          >
            🔒 Hidden until upgrade.
          </p>
        ) : (
          <div className="space-y-2">
            {signal.takeProfits.map((tp) => (
              <div
                key={tp.level}
                className="flex items-center justify-between rounded-md border px-4 py-2.5"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <span className="text-sm">TP{tp.level}</span>
                <span className="font-data">{tp.price}</span>
                <span
                  className="text-xs"
                  style={{ color: tp.hitAt ? "var(--long)" : "var(--text-tertiary)" }}
                >
                  {tp.hitAt ? "Hit" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {signal.note && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            Note
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{signal.note}</p>
        </div>
      )}
    </div>
  );
}
