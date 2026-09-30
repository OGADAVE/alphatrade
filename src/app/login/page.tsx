"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        // Firebase Auth succeeded but the server couldn't verify the token
        // (e.g. Admin SDK isn't configured yet) — the user is still signed
        // in client-side, just without server-gated admin access.
        console.warn("Could not establish a server session; admin routes will stay locked out.");
      }
      router.push("/");
    } catch {
      setError("Couldn't sign in. Check your email and password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm" style={{ color: "var(--text-secondary)" }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm" style={{ color: "var(--text-secondary)" }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          />
        </div>
        {error && <p className="text-sm" style={{ color: "var(--short)" }}>{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md py-2 text-sm font-semibold"
          style={{ background: "var(--accent)", color: "#0B0F14" }}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
        No account?{" "}
        <Link href="/register" style={{ color: "var(--accent)" }}>
          Register
        </Link>
      </p>
    </div>
  );
}
