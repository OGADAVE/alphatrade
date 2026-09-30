"use client";

import { useAuth } from "@/context/AuthContext";
import { toggleWatchlistSymbol } from "@/lib/user-actions-client";

export default function WatchToggle({ symbol }: { symbol: string }) {
  const { user, profile } = useAuth();
  if (!user) return null;

  const isWatching = profile?.watchlist?.includes(symbol) ?? false;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWatchlistSymbol(user.uid, symbol, isWatching);
      }}
      className="rounded-sm border px-1.5 py-0.5 text-xs"
      style={{
        color: isWatching ? "var(--accent)" : "var(--text-tertiary)",
        borderColor: isWatching ? "var(--accent-dim)" : "var(--border-strong)",
      }}
    >
      {isWatching ? "Watching" : "Watch"}
    </button>
  );
}
