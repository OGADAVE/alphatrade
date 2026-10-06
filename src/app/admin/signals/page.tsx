import { getSignals, getStrategies } from "@/lib/signals-data";
import StatusBadge from "@/components/StatusBadge";
import { cancelSignal, closeSignal, modifyStopLoss, markInvalid } from "./actions";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

const OPEN_STATUSES = ["PENDING", "ACTIVE", "TP1_HIT", "TP2_HIT", "TP3_HIT"];

export default async function SignalModerationPage() {
  const [allSignals, strategies] = await Promise.all([getSignals(), getStrategies()]);
  const openSignals = allSignals.filter((s) => OPEN_STATUSES.includes(s.status));
  const strategyName = (id: string) => strategies.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Signal moderation</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Overrides only apply to open signals. Every action here is
          recorded in the audit log.
        </p>
      </div>

      {openSignals.length === 0 && (
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          No open signals right now.
        </p>
      )}

      <div className="space-y-3">
        {openSignals.map((signal) => (
          <div
            key={signal.id}
            className="rounded-md border p-4"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-data font-semibold">{signal.symbol}</span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: signal.direction === "LONG" ? "var(--long)" : "var(--short)" }}
                >
                  {signal.direction}
                </span>
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {strategyName(signal.strategyId)}
                </span>
              </div>
              <StatusBadge status={signal.status} />
            </div>

            <div className="mt-2 flex gap-4 font-data text-xs" style={{ color: "var(--text-secondary)" }}>
              <span>Entry {formatPrice(signal.entry, signal.market, signal.symbol)}</span>
              <span>SL {formatPrice(signal.stopLoss, signal.market, signal.symbol)}</span>
              {signal.takeProfits[0] && (
                <span>TP1 {formatPrice(signal.takeProfits[0].price, signal.market, signal.symbol)}</span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <form action={closeSignal.bind(null, signal.id)}>
                <button
                  type="submit"
                  className="rounded-sm border px-2 py-1 text-xs"
                  style={{ borderColor: "var(--border-strong)" }}
                >
                  Close
                </button>
              </form>

              <form action={cancelSignal.bind(null, signal.id, "Cancelled by admin.")}>
                <button
                  type="submit"
                  className="rounded-sm border px-2 py-1 text-xs"
                  style={{ color: "var(--short)", borderColor: "var(--short-dim)" }}
                >
                  Cancel
                </button>
              </form>

              <form action={markInvalid.bind(null, signal.id, "Flagged as malformed/invalid by admin.")}>
                <button
                  type="submit"
                  className="rounded-sm border px-2 py-1 text-xs"
                  style={{ color: "var(--pending)", borderColor: "var(--pending)" }}
                >
                  Mark invalid
                </button>
              </form>

              <form
                action={async (fd: FormData) => {
                  "use server";
                  const value = Number(fd.get("newStopLoss"));
                  if (Number.isFinite(value) && value > 0) {
                    await modifyStopLoss(signal.id, value);
                  }
                }}
                className="flex items-center gap-1"
              >
                <input
                  name="newStopLoss"
                  type="number"
                  step="any"
                  placeholder="New SL"
                  required
                  className="w-24 rounded-md border px-2 py-1 text-xs"
                  style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
                />
                <button
                  type="submit"
                  className="rounded-sm border px-2 py-1 text-xs"
                  style={{ borderColor: "var(--border-strong)" }}
                >
                  Update SL
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
