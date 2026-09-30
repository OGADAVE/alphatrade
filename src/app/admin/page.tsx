import StatTile from "@/components/StatTile";
import { getSignals } from "@/lib/signals-data";

export const dynamic = "force-dynamic";

// This page renders only after AdminLayout's requireAdmin() check passes —
// that's the real access control (session cookie + Firestore role, verified
// server-side). This page itself doesn't need to re-check.
export default async function AdminDashboardPage() {
  const signals = await getSignals();
  const active = signals.filter((s) => s.status === "ACTIVE").length;
  const wins = signals.filter((s) => s.result === "WIN").length;
  const losses = signals.filter((s) => s.result === "LOSS").length;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Admin dashboard</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        Platform overview. Source, strategy, and user management arrive next.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Active signals" value={String(active)} />
        <StatTile label="Total signals" value={String(signals.length)} />
        <StatTile label="Wins" value={String(wins)} tone="long" />
        <StatTile label="Losses" value={String(losses)} tone="short" />
      </div>

      <div
        className="mt-8 rounded-md border p-4 text-sm"
        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
      >
        Coming next: signal source management, strategy management, signal
        moderation, user management, and the audit log.
      </div>
    </div>
  );
}
