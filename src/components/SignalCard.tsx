import Link from "next/link";
import type { Signal } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import FavoriteButton from "./FavoriteButton";
import WatchToggle from "./WatchToggle";
import { formatPrice, formatPercent } from "@/lib/format";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);

  if (hrs < 24) return `${hrs}h ago`;

  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SignalCard({
  signal,
  strategyName,
  showMilestones = false,
}: {
  signal: Signal;
  strategyName?: string;
  showMilestones?: boolean;
}) {
  const directionColor =
    signal.direction === "LONG"
      ? "var(--long)"
      : "var(--short)";

  /*
   * Only show targets that were actually hit.
   *
   * This is important because the history page should
   * display the real sequence of events stored on the signal.
   */
  const hitTargets = signal.takeProfits
    .filter((tp) => Boolean(tp.hitAt))
    .sort((a, b) => a.level - b.level);

  /*
   * SL may be represented by either the final status
   * or the slHitAt timestamp.
   */
  const slWasHit =
    signal.status === "SL_HIT" ||
    Boolean(signal.slHitAt);

  return (
    <Link
      href={`/signals/${signal.id}`}
      className="block rounded-md border p-4 transition-colors hover:border-[var(--border-strong)]"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex items-start justify-between gap-3">

        <div>

          <div className="flex items-center gap-2">

            <span className="font-data text-base font-semibold">
              {signal.symbol}
            </span>

            <span
              className="text-xs font-semibold tracking-wide"
              style={{
                color: directionColor,
              }}
            >
              {signal.direction}
            </span>

          </div>


          <p
            className="mt-0.5 text-xs"
            style={{
              color: "var(--text-secondary)",
            }}
          >
            {strategyName ?? "Unknown strategy"} ·{" "}
            {signal.timeframe} ·{" "}
            {signal.riskLevel} risk ·{" "}
            {timeAgo(signal.createdAt)}
          </p>

        </div>


        <div className="flex items-center gap-2">

          <WatchToggle
            symbol={signal.symbol}
          />


          {signal.premiumOnly && (
            <span
              className="rounded-sm border px-2 py-0.5 text-xs font-medium"
              style={{
                color: "var(--pending)",
                borderColor: "var(--pending)",
                background: "var(--pending-bg)",
              }}
            >
              Premium
            </span>
          )}


          <StatusBadge
            status={signal.status}
          />


          <FavoriteButton
            signalId={signal.id}
          />

        </div>

      </div>


      {/* =====================================================
          ENTRY / SL / TP
      ====================================================== */}

      <div className="mt-4 grid grid-cols-3 gap-3 font-data text-sm">

        <div>

          <p
            className="text-xs"
            style={{
              color: "var(--text-tertiary)",
            }}
          >
            Entry
          </p>

          <p>
            {signal.restricted
              ? "🔒"
              : formatPrice(
                  signal.entry,
                  signal.market,
                  signal.symbol,
                )}
          </p>

        </div>


        <div>

          <p
            className="text-xs"
            style={{
              color: "var(--text-tertiary)",
            }}
          >
            Stop loss
          </p>

          <p
            style={{
              color: "var(--short)",
            }}
          >
            {signal.restricted
              ? "🔒"
              : formatPrice(
                  signal.stopLoss,
                  signal.market,
                  signal.symbol,
                )}
          </p>

        </div>


        <div>

          <p
            className="text-xs"
            style={{
              color: "var(--text-tertiary)",
            }}
          >
            Take profit
          </p>

          <p
            style={{
              color: "var(--long)",
            }}
          >
            {signal.restricted ||
            !signal.takeProfits[0]
              ? "🔒"
              : formatPrice(
                  signal.takeProfits[0].price,
                  signal.market,
                  signal.symbol,
                )}
          </p>

        </div>

      </div>


      {/* =====================================================
          TRADE JOURNEY / MILESTONES
      ====================================================== */}

      {showMilestones &&
        (hitTargets.length > 0 || slWasHit) && (

          <div
            className="mt-4 rounded-md border px-3 py-3"
            style={{
              borderColor: "var(--border)",
            }}
          >

            <div
              className="text-xs font-semibold"
              style={{
                color: "var(--text-secondary)",
              }}
            >
              Trade journey
            </div>


            <div className="mt-2 flex flex-wrap items-center gap-2">

              {hitTargets.map((tp, index) => (

                <div
                  key={tp.level}
                  className="flex items-center gap-2"
                >

                  <span
                    className="rounded-sm border px-2 py-1 text-xs font-semibold"
                    style={{
                      color: "var(--long)",
                      borderColor: "var(--long)",
                    }}
                  >
                    TP{tp.level} HIT
                  </span>


                  {index <
                    hitTargets.length - 1 && (
                    <span
                      className="text-xs"
                      style={{
                        color: "var(--text-tertiary)",
                      }}
                    >
                      →
                    </span>
                  )}

                </div>

              ))}


              {slWasHit && (
                <>

                  {hitTargets.length > 0 && (
                    <span
                      className="text-xs"
                      style={{
                        color: "var(--text-tertiary)",
                      }}
                    >
                      →
                    </span>
                  )}


                  <span
                    className="rounded-sm border px-2 py-1 text-xs font-semibold"
                    style={{
                      color: "var(--short)",
                      borderColor: "var(--short)",
                    }}
                  >
                    SL HIT
                  </span>

                </>
              )}

            </div>

          </div>

        )}


      {/* =====================================================
          PREMIUM MESSAGE
      ====================================================== */}

      {signal.restricted && (
        <p
          className="mt-2 text-xs"
          style={{
            color: "var(--pending)",
          }}
        >
          Premium signal — upgrade to see entry/exit levels.
        </p>
      )}


      {/* =====================================================
          P&L
      ====================================================== */}

      {typeof signal.pnlPercent === "number" && (

        <p
          className="mt-3 font-data text-sm font-semibold"
          style={{
            color:
              signal.pnlPercent >= 0
                ? "var(--long)"
                : "var(--short)",
          }}
        >
          {formatPercent(
            signal.pnlPercent
          )}
        </p>

      )}

    </Link>
  );
}