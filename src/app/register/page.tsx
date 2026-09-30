"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agreedToTerms) {
      setError("You need to agree to the Terms & Conditions to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Create the user's app profile document (role defaults to "user").
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        email: cred.user.email,
        role: "user",
        tier: "free",
        watchlist: [],
        followedStrategyIds: [],
        favoriteSignalIds: [],
        agreedToTermsAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        console.warn("Could not establish a server session; admin routes will stay locked out.");
      }
      router.push("/");
    } catch {
      setError("Couldn't create your account. Try a different email.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Create an account</h1>
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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          />
        </div>
        <label className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            By clicking continue, you agree to the{" "}
            <Link href="/terms" target="_blank" style={{ color: "var(--accent)" }}>
              Terms &amp; Conditions
            </Link>
            , including the risk disclosure — trading carries risk of loss
            and signals are informational, not investment advice.
          </span>
        </label>
        {error && <p className="text-sm" style={{ color: "var(--short)" }}>{error}</p>}
        <button
          type="submit"
          disabled={submitting || !agreedToTerms}
          className="w-full rounded-md py-2 text-sm font-semibold"
          style={{ background: "var(--accent)", color: "#0B0F14" }}
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "var(--accent)" }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
