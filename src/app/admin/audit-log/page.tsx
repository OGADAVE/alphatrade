import { getAuditLog } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const entries = await getAuditLog();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Every admin override from Sources, Strategies, Signals, and Users
          is recorded here.
        </p>
      </div>

      <div
        className="overflow-hidden rounded-md border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: "var(--text-tertiary)" }}>
              <th className="px-4 py-2.5 font-normal">Time</th>
              <th className="px-4 py-2.5 font-normal">Action</th>
              <th className="px-4 py-2.5 font-normal">Target</th>
              <th className="px-4 py-2.5 font-normal">Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t align-top" style={{ borderColor: "var(--border)" }}>
                <td className="font-data whitespace-nowrap px-4 py-2.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-xs font-semibold">{entry.action}</td>
                <td className="font-data px-4 py-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {entry.targetType}/{entry.targetId}
                </td>
                <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {entry.details}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
                  No admin actions recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
