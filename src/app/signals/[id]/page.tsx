import Link from "next/link";
import { notFound } from "next/navigation";
import { getSignalById, getStrategyById } from "@/lib/signals-data";
import { getServerUser } from "@/lib/get-server-user";
import { getEntitlement, applyEntitlement } from "@/lib/entitlements";
import StatusBadge from "@/components/StatusBadge";
import LivePrice from "@/components/LivePrice";
import { formatPrice, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

const TERMINAL_STATUSES = ["FULL_TP", "SL_HIT", "CANCELLED", "EXPIRED", "CLOSED"];

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
  const isOpen = !TERMINAL_STATUSES.includes(signal.status);
  const tp1 = signal.takeProfits.find((tp) => tp.level === 1);
  const tp2 = signal.takeProfits.find((tp) => tp.level === 2);
  const tp3 = signal.takeProfits.find((tp) => tp.level === 3);

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

      {/* Entry, Current, TP1, TP2, TP3, SL — in that order. Current price
          is live market state, fetched fresh (never stored on the
          signal), and stays visible even when restricted since it isn't
          proprietary trade data. */}
      <div
        className="mt-6 rounded-md border p-5"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>Entry</span>
          <span className="font-data text-lg">
            {signal.restricted ? "🔒" : formatPrice(signal.entry)}
          </span>
        </div>
        <div className="flex items-center justify-between border-t py-1.5" style={{ borderColor: "var(--border)" }}>
          <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>Current</span>
          {isOpen ? (
            <span className="text-lg">
              <LivePrice symbol={signal.symbol} market={signal.market} />
            </span>
          ) : (
            <span className="font-data text-lg" style={{ color: "var(--text-tertiary)" }}>—</span>
          )}
        </div>
        {tp1 && (
          <div className="flex items-center justify-between border-t py-1.5" style={{ borderColor: "var(--border)" }}>
            <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>TP1</span>
            <span className="flex items-center gap-2 font-data text-lg" style={{ color: "var(--long)" }}>
              {signal.restricted ? "🔒" : formatPrice(tp1.price)}
              {!signal.restricted && (
                <span className="text-xs" style={{ color: tp1.hitAt ? "var(--long)" : "var(--text-tertiary)" }}>
                  {tp1.hitAt ? "Hit" : "Pending"}
                </span>
              )}
            </span>
          </div>
        )}
        {tp2 && (
          <div className="flex items-center justify-between border-t py-1.5" style={{ borderColor: "var(--border)" }}>
            <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>TP2</span>
            <span className="flex items-center gap-2 font-data text-lg" style={{ color: "var(--long)" }}>
              {signal.restricted ? "🔒" : formatPrice(tp2.price)}
              {!signal.restricted && (
                <span className="text-xs" style={{ color: tp2.hitAt ? "var(--long)" : "var(--text-tertiary)" }}>
                  {tp2.hitAt ? "Hit" : "Pending"}
                </span>
              )}
            </span>
          </div>
        )}
        {tp3 && (
          <div className="flex items-center justify-between border-t py-1.5" style={{ borderColor: "var(--border)" }}>
            <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>TP3</span>
            <span className="flex items-center gap-2 font-data text-lg" style={{ color: "var(--long)" }}>
              {signal.restricted ? "🔒" : formatPrice(tp3.price)}
              {!signal.restricted && (
                <span className="text-xs" style={{ color: tp3.hitAt ? "var(--long)" : "var(--text-tertiary)" }}>
                  {tp3.hitAt ? "Hit" : "Pending"}
                </span>
              )}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between border-t py-1.5" style={{ borderColor: "var(--border)" }}>
          <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>SL</span>
          <span className="font-data text-lg" style={{ color: "var(--short)" }}>
            {signal.restricted ? "🔒" : formatPrice(signal.stopLoss)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Confidence</p>
          <p className="font-data text-sm">{signal.confidence}%</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>P/L</p>
          <p
            className="font-data text-sm"
            style={{ color: (signal.pnlPercent ?? 0) >= 0 ? "var(--long)" : "var(--short)" }}
          >
            {signal.pnlPercent != null ? formatPercent(signal.pnlPercent) : "—"}
          </p>
        </div>
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