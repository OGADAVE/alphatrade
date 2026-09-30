import type { SignalStatus } from "@/lib/types";

const STATUS_LABEL: Record<SignalStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  TP1_HIT: "TP1 hit",
  TP2_HIT: "TP2 hit",
  TP3_HIT: "TP3 hit",
  FULL_TP: "Full TP",
  SL_HIT: "SL hit",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  CLOSED: "Closed",
};

function toneFor(status: SignalStatus): "long" | "short" | "pending" | "neutral" {
  if (status === "FULL_TP" || status.startsWith("TP") || status === "ACTIVE") return "long";
  if (status === "SL_HIT") return "short";
  if (status === "PENDING") return "pending";
  return "neutral";
}

const TONE_STYLES = {
  long: { color: "var(--long)", background: "var(--long-bg)", borderColor: "var(--long-dim)" },
  short: { color: "var(--short)", background: "var(--short-bg)", borderColor: "var(--short-dim)" },
  pending: { color: "var(--pending)", background: "var(--pending-bg)", borderColor: "var(--pending)" },
  neutral: { color: "var(--text-secondary)", background: "var(--surface-hover)", borderColor: "var(--border-strong)" },
};

export default function StatusBadge({ status }: { status: SignalStatus }) {
  const tone = toneFor(status);
  const style = TONE_STYLES[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium"
      style={style}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: style.color }}
        aria-hidden
      />
      {STATUS_LABEL[status]}
    </span>
  );
}
