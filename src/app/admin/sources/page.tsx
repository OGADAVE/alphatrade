import { getSignalSources } from "@/lib/admin-data";
import { createSource, toggleSourceField } from "./actions";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const sources = await getSignalSources();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Signal sources</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Every external/internal source must be authorized and active before
          its signals are accepted (spec section 7).
        </p>
      </div>

      <div
        className="overflow-hidden rounded-md border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: "var(--text-tertiary)" }}>
              <th className="px-4 py-2.5 font-normal">Name</th>
              <th className="px-4 py-2.5 font-normal">Type</th>
              <th className="px-4 py-2.5 font-normal">Authorized</th>
              <th className="px-4 py-2.5 font-normal">Active</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-4 py-2.5 font-medium">{source.name}</td>
                <td className="px-4 py-2.5 font-data text-xs" style={{ color: "var(--text-secondary)" }}>
                  {source.type}
                </td>
                <td className="px-4 py-2.5">
                  <form
                    action={toggleSourceField.bind(null, source.id, "authorized", !source.authorized)}
                  >
                    <button
                      type="submit"
                      className="rounded-sm border px-2 py-0.5 text-xs"
                      style={{
                        color: source.authorized ? "var(--long)" : "var(--short)",
                        borderColor: source.authorized ? "var(--long-dim)" : "var(--short-dim)",
                      }}
                    >
                      {source.authorized ? "Authorized" : "Not authorized"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-2.5">
                  <form action={toggleSourceField.bind(null, source.id, "active", !source.active)}>
                    <button
                      type="submit"
                      className="rounded-sm border px-2 py-0.5 text-xs"
                      style={{
                        color: source.active ? "var(--long)" : "var(--text-tertiary)",
                        borderColor: source.active ? "var(--long-dim)" : "var(--border-strong)",
                      }}
                    >
                      {source.active ? "Active" : "Inactive"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {sources.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
                  No sources yet — add one below, or run scripts/seed.mjs.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        className="rounded-md border p-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h2 className="mb-3 text-sm font-semibold">Add a source</h2>
        <form action={createSource} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>Name</label>
            <input
              name="name"
              required
              className="mt-1 rounded-md border px-3 py-1.5 text-sm"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
            />
          </div>
          <div>
            <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>Type</label>
            <select
              name="type"
              className="mt-1 rounded-md border px-3 py-1.5 text-sm"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
            >
              <option value="external_api">External API</option>
              <option value="tradingview">TradingView</option>
              <option value="telegram_discord">Telegram/Discord</option>
              <option value="human_analyst">Human analyst</option>
              <option value="internal_algorithm">Internal algorithm</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md px-4 py-1.5 text-sm font-semibold"
            style={{ background: "var(--accent)", color: "#0B0F14" }}
          >
            Add source
          </button>
        </form>
        <p className="mt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
          External API sources get an auto-generated key — it&apos;s stored
          on the source doc and never shown here yet; check Firestore
          directly until a reveal-once UI is built.
        </p>
      </div>
    </div>
  );
}
