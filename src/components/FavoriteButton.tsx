"use client";

import { useAuth } from "@/context/AuthContext";
import { toggleFavoriteSignal } from "@/lib/user-actions-client";

export default function FavoriteButton({ signalId }: { signalId: string }) {
  const { user, profile } = useAuth();
  if (!user) return null;

  const isFavorited = profile?.favoriteSignalIds?.includes(signalId) ?? false;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault(); // don't follow the card's <Link> to the detail page
        e.stopPropagation();
        toggleFavoriteSignal(user.uid, signalId, isFavorited);
      }}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      className="shrink-0 text-base leading-none"
      style={{ color: isFavorited ? "var(--pending)" : "var(--text-tertiary)" }}
    >
      {isFavorited ? "★" : "☆"}
    </button>
  );
}
