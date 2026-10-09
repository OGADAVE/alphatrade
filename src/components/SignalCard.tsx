import Link from "next/link";
import type { Signal } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import FavoriteButton from "./FavoriteButton";
import WatchToggle from "./WatchToggle";
import LivePrice from "./LivePrice";
import { formatPrice, formatPercent } from "@/lib/format";

const TERMINAL_STATUSES = ["FULL_TP", "SL_HIT", "CANCELLED", "EXPIRED", "CLOSED"];

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
}: {
  signal: Signal;
  strategyName?: string;
}) {
  const directionColor = signal.direction === "LONG" ? "var(--long)" : "var(--short)";
  const isOpen = !TERMINAL_STATUSES.includes(signal.status);
  const tp1 = signal.takeProfits.find((tp) => tp.level === 1);
  const tp2 = signal.takeProfits.find((tp) => tp.level === 2);
  const tp3 = signal.takeProfits.find((tp) => tp.level === 3);

  return (
    <Link
      href={`/signals/${signal.id}`}
      className="block rounded-md border p-4 transition-colors hover:border-[var(--border-strong)]"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-data text-base font-semibold">{signal.symbol}</span>
            <span
              className="text-xs font-semibold tracking-wide"
              style={{ color: directionColor }}
            >
              {signal.direction}
            </span>
          </div>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
            {strategyName ?? "Unknown strategy"} · {signal.timeframe} · {signal.riskLevel} risk · {timeAgo(signal.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <WatchToggle symbol={signal.symbol} />
          {signal.premiumOnly && (
            <span
              className="rounded-sm border px-2 py-0.5 text-xs font-medium"
              style={{ color: "var(--pending)", borderColor: "var(--pending)", background: "var(--pending-bg)" }}
            >
              Premium
            </span>
          )}
          <StatusBadge status={signal.status} />
          <FavoriteButton signalId={signal.id} />
        </div>
      </div>

      {/* Entry, Current, TP1, TP2, TP3, SL — in that order. Current price
          is live market state (never stored on the signal) and stays
          visible even when the trade levels are restricted for a
          non-premium viewer, since it isn't proprietary trade data. */}
      <div className="mt-4 space-y-1.5 text-sm">
        <div className="flex items-center justify-between">
          <span style={{ color: "var(--text-tertiary)" }}>Entry</span>
          <span className="font-data">{signal.restricted ? "🔒" : formatPrice(signal.entry)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: "var(--text-tertiary)" }}>Current</span>
          {isOpen ? (
            <LivePrice symbol={signal.symbol} market={signal.market} />
          ) : (
            <span className="font-data" style={{ color: "var(--text-tertiary)" }}>—</span>
          )}
        </div>
        {tp1 && (
          <div className="flex items-center justify-between">
            <span style={{ color: "var(--text-tertiary)" }}>TP1</span>
            <span className="font-data" style={{ color: "var(--long)" }}>
              {signal.restricted ? "🔒" : formatPrice(tp1.price)}
            </span>
          </div>
        )}
        {tp2 && (
          <div className="flex items-center justify-between">
            <span style={{ color: "var(--text-tertiary)" }}>TP2</span>
            <span className="font-data" style={{ color: "var(--long)" }}>
              {signal.restricted ? "🔒" : formatPrice(tp2.price)}
            </span>
          </div>
        )}
        {tp3 && (
          <div className="flex items-center justify-between">
            <span style={{ color: "var(--text-tertiary)" }}>TP3</span>
            <span className="font-data" style={{ color: "var(--long)" }}>
              {signal.restricted ? "🔒" : formatPrice(tp3.price)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span style={{ color: "var(--text-tertiary)" }}>SL</span>
          <span className="font-data" style={{ color: "var(--short)" }}>
            {signal.restricted ? "🔒" : formatPrice(signal.stopLoss)}
          </span>
        </div>
      </div>

      {signal.restricted && (
        <p className="mt-2 text-xs" style={{ color: "var(--pending)" }}>
          Premium signal — upgrade to see entry/exit levels.
        </p>
      )}

      {typeof signal.pnlPercent === "number" && (
        <p
          className="mt-3 font-data text-sm font-semibold"
          style={{ color: signal.pnlPercent >= 0 ? "var(--long)" : "var(--short)" }}
        >
          {formatPercent(signal.pnlPercent)}
        </p>
      )}
    </Link>
  );
}