import { getUsers } from "@/lib/admin-data";
import { setUserSuspended } from "./actions";

export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const users = await getUsers();
  const filtered = q ? users.filter((u) => u.email?.toLowerCase().includes(q.toLowerCase())) : users;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Showing the 200 most recently registered users.
        </p>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by email"
          className="rounded-md border px-3 py-1.5 text-sm"
          style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
        />
        <button
          type="submit"
          className="rounded-md border px-3 py-1.5 text-sm"
          style={{ borderColor: "var(--border-strong)" }}
        >
          Search
        </button>
      </form>

      <div
        className="overflow-hidden rounded-md border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: "var(--text-tertiary)" }}>
              <th className="px-4 py-2.5 font-normal">Email</th>
              <th className="px-4 py-2.5 font-normal">Role</th>
              <th className="px-4 py-2.5 font-normal">Tier</th>
              <th className="px-4 py-2.5 font-normal">Joined</th>
              <th className="px-4 py-2.5 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.uid} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-4 py-2.5">{user.email}</td>
                <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {user.role}
                </td>
                <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {user.tier}
                </td>
                <td className="font-data px-4 py-2.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <form action={setUserSuspended.bind(null, user.uid, !user.suspended)}>
                    <button
                      type="submit"
                      className="rounded-sm border px-2 py-0.5 text-xs"
                      style={{
                        color: user.suspended ? "var(--short)" : "var(--long)",
                        borderColor: user.suspended ? "var(--short-dim)" : "var(--long-dim)",
                      }}
                    >
                      {user.suspended ? "Suspended — reactivate" : "Active — suspend"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
                  No users match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
