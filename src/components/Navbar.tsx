"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/crypto", label: "Crypto" },
  { href: "/forex", label: "Forex" },
  { href: "/history", label: "History" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const links = user ? [...LINKS, { href: "/watchlist", label: "Watchlist" }] : LINKS;

  async function handleSignOut() {
    await signOut(auth);
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <header
      className="sticky top-0 z-10 border-b backdrop-blur-sm"
      style={{ background: "rgba(11,15,20,0.85)", borderColor: "var(--border)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-data text-lg font-bold tracking-tight">AlphaTrade</span>
          <span className="hidden text-xs sm:inline" style={{ color: "var(--text-tertiary)" }}>
            Signals
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-sm px-3 py-1.5 text-sm transition-colors"
                style={{
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  background: active ? "var(--surface-hover)" : "transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {user ? (
          <button
            onClick={handleSignOut}
            className="rounded-sm border px-3 py-1.5 text-sm font-medium"
            style={{ borderColor: "var(--border-strong)", color: "var(--text-primary)" }}
          >
            Sign out
          </button>
        ) : (
          <Link
            href="/login"
            className="rounded-sm border px-3 py-1.5 text-sm font-medium"
            style={{ borderColor: "var(--border-strong)", color: "var(--text-primary)" }}
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
