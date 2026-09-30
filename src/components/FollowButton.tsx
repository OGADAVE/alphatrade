"use client";

import { useAuth } from "@/context/AuthContext";
import { toggleFollowStrategy } from "@/lib/user-actions-client";

export default function FollowButton({ strategyId }: { strategyId: string }) {
  const { user, profile } = useAuth();
  if (!user) return null;

  const isFollowing = profile?.followedStrategyIds?.includes(strategyId) ?? false;

  return (
    <button
      type="button"
      onClick={() => toggleFollowStrategy(user.uid, strategyId, isFollowing)}
      className="rounded-sm border px-2 py-0.5 text-xs"
      style={{
        color: isFollowing ? "var(--accent)" : "var(--text-tertiary)",
        borderColor: isFollowing ? "var(--accent-dim)" : "var(--border-strong)",
      }}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}
