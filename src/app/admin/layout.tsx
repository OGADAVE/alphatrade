import Link from "next/link";
import { requireAdmin } from "@/lib/get-server-user";
import AdminNav from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  if (!admin) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Admin access required</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          Sign in with an administrator account to continue.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm" style={{ color: "var(--accent)" }}>
          Sign in →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <AdminNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
