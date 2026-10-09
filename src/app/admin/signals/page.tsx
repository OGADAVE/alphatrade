import { getSignals, getStrategies } from "@/lib/signals-data";
import StatusBadge from "@/components/StatusBadge";
import { cancelSignal, closeSignal, modifyStopLoss, markInvalid } from "./actions";
import { createManualSignal, publishDraftSignal } from "./create-actions";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

const OPEN_STATUSES = ["PENDING", "ACTIVE", "TP1_HIT", "TP2_HIT", "TP3_HIT"];

export default async function SignalModerationPage() {
  const [allSignals, strategies] = await Promise.all([getSignals(), getStrategies()]);
  const drafts = allSignals.filter((s) => s.status === "PENDING");
  const openSignals = allSignals.filter((s) => OPEN_STATUSES.includes(s.status) && s.status !== "PENDING");
  const strategyName = (id: string) => strategies.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Signals</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Create signals manually, publish drafts, and moderate open
          signals. Every action here is recorded in the audit log.
        </p>
      </div>

      {/* --- Create a signal --- */}
      <div
        className="rounded-md border p-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h2 className="mb-3 text-sm font-semibold">Create a signal</h2>
        <form action={createManualSignal} className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>Market</label>
              <select
                name="market"
                className="mt-1 rounded-md border px-3 py-1.5 text-sm"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
              >
                <option value="crypto">Crypto</option>
                <option value="forex">Forex</option>
              </select>
            </div>
            <div>
              <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>Symbol</label>
              <input
                name="symbol"
                required
                placeholder="BTC/USDT"
                className="mt-1 w-32 rounded-md border px-3 py-1.5 text-sm font-data"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>Direction</label>
              <select
                name="direction"
                className="mt-1 rounded-md border px-3 py-1.5 text-sm"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
              >
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
              </select>
            </div>
            <div>
              <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>Timeframe</label>
              <select
                name="timeframe"
                className="mt-1 rounded-md border px-3 py-1.5 text-sm"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
              >
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="30m">30m</option>
                <option value="1h">1h</option>
                <option value="4h">4h</option>
                <option value="1d">1d</option>
              </select>
            </div>
            <div>
              <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>Confidence %</label>
              <input
                name="confidence"
                type="number"
                min={1}
                max={100}
                defaultValue={75}
                className="mt-1 w-24 rounded-md border px-3 py-1.5 text-sm font-data"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>Entry</label>
              <input
                name="entry"
                type="number"
                step="any"
                required
                className="mt-1 w-32 rounded-md border px-3 py-1.5 text-sm font-data"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>Stop loss</label>
              <input
                name="stopLoss"
                type="number"
                step="any"
                required
                className="mt-1 w-32 rounded-md border px-3 py-1.5 text-sm font-data"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>TP1</label>
              <input
                name="tp1"
                type="number"
                step="any"
                required
                className="mt-1 w-28 rounded-md border px-3 py-1.5 text-sm font-data"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>TP2 (optional)</label>
              <input
                name="tp2"
                type="number"
                step="any"
                className="mt-1 w-28 rounded-md border px-3 py-1.5 text-sm font-data"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>TP3 (optional)</label>
              <input
                name="tp3"
                type="number"
                step="any"
                className="mt-1 w-28 rounded-md border px-3 py-1.5 text-sm font-data"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>
              Analysis / note
            </label>
            <textarea
              name="note"
              rows={3}
              placeholder="e.g. BTC showing strong bullish momentum following breakout above resistance."
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <input type="checkbox" name="publishNow" defaultChecked />
              Publish immediately (uncheck to save as a draft for review)
            </label>
            <button
              type="submit"
              className="rounded-md px-4 py-1.5 text-sm font-semibold"
              style={{ background: "var(--accent)", color: "#0B0F14" }}
            >
              Create signal
            </button>
          </div>
        </form>
      </div>

      {/* --- Drafts --- */}
      {drafts.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Drafts awaiting publish</h2>
          <div className="space-y-3">
            {drafts.map((signal) => (
              <div
                key={signal.id}
                className="rounded-md border p-4"
                style={{ background: "var(--surface)", borderColor: "var(--pending)" }}
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
                    {signal.createdByEmail && (
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        by {signal.createdByEmail}
                      </span>
                    )}
                  </div>
                  <form action={publishDraftSignal.bind(null, signal.id)}>
                    <button
                      type="submit"
                      className="rounded-sm px-3 py-1 text-xs font-semibold"
                      style={{ background: "var(--long)", color: "#0B0F14" }}
                    >
                      Publish now
                    </button>
                  </form>
                </div>
                <div className="mt-2 flex gap-4 font-data text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span>Entry {formatPrice(signal.entry)}</span>
                  <span>SL {formatPrice(signal.stopLoss)}</span>
                  {signal.takeProfits[0] && (
                    <span>TP1 {formatPrice(signal.takeProfits[0].price)}</span>
                  )}
                </div>
                {signal.note && (
                  <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>{signal.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Moderation --- */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Open signals</h2>
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
                  {signal.createdByEmail && (
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      · by {signal.createdByEmail}
                    </span>
                  )}
                </div>
                <StatusBadge status={signal.status} />
              </div>

              <div className="mt-2 flex gap-4 font-data text-xs" style={{ color: "var(--text-secondary)" }}>
                <span>Entry {formatPrice(signal.entry)}</span>
                <span>SL {formatPrice(signal.stopLoss)}</span>
                {signal.takeProfits[0] && (
                  <span>TP1 {formatPrice(signal.takeProfits[0].price)}</span>
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
    </div>
  );
}