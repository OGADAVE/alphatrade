"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  profile: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Firebase env vars aren't configured yet (early Phase 1), this
    // listener simply never fires — the app still renders with user: null.
    const unsubscribe = onAuthStateChanged(
      auth,
      (u) => {
        setUser(u);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => setProfile(null));
      return;
    }
    // Live subscription so watchlist/follow/favorite toggles reflect
    // instantly everywhere the profile is used, without a manual refetch.
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => setProfile(snap.exists() ? ({ uid: snap.id, ...snap.data() } as AppUser) : null),
      () => setProfile(null),
    );
    return () => unsubscribe();
  }, [user]);

  return <AuthContext.Provider value={{ user, profile, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
