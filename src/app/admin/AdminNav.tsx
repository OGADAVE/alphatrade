"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/sources", label: "Sources" },
  { href: "/admin/strategies", label: "Strategies" },
  { href: "/admin/signals", label: "Signals" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit-log", label: "Audit log" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b pb-2"
      style={{ borderColor: "var(--border)" }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="whitespace-nowrap rounded-sm px-3 py-1.5 text-sm"
            style={{
              color: active ? "var(--text-primary)" : "var(--text-secondary)",
              background: active ? "var(--surface-hover)" : "transparent",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
