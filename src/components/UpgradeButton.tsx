"use client";

import { useState } from "react";

export default function UpgradeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/initialize", { method: "POST" });
      const data = (await res.json()) as { authorizationUrl?: string; error?: string };
      if (!res.ok || !data.authorizationUrl) {
        setError(data.error ?? "Could not start checkout.");
        setLoading(false);
        return;
      }
      window.location.href = data.authorizationUrl;
    } catch {
      setError("Could not start checkout.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={loading}
        className="rounded-md px-4 py-2 text-sm font-semibold"
        style={{ background: "var(--accent)", color: "#0B0F14" }}
      >
        {loading ? "Redirecting to checkout…" : "Upgrade to Premium"}
      </button>
      {error && (
        <p className="mt-2 text-sm" style={{ color: "var(--short)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
