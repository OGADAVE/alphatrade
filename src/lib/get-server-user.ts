import "server-only";
import { cookies } from "next/headers";
import { adminAuth, adminDb, isAdminConfigured } from "./firebase-admin";
import type { AppUser } from "./types";

export interface ServerUser {
  uid: string;
  email: string | null;
  role: AppUser["role"];
  tier: AppUser["tier"];
  watchlist: string[];
  followedStrategyIds: string[];
  favoriteSignalIds: string[];
}

/**
 * Resolves the current user from the httpOnly session cookie set by
 * /api/auth/session. Returns null if there's no session, the session is
 * invalid/expired, or Firebase Admin isn't configured yet — callers should
 * treat null as "not signed in" and never assume it means "not an admin"
 * vs. "misconfigured server" differently for security purposes.
 */
export async function getServerUser(): Promise<ServerUser | null> {
  if (!isAdminConfigured()) return null;

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
    const userDoc = await adminDb().collection("users").doc(decoded.uid).get();
    const data = userDoc.data() as Partial<AppUser> | undefined;

    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      role: data?.role ?? "user",
      tier: data?.tier ?? "free",
      watchlist: data?.watchlist ?? [],
      followedStrategyIds: data?.followedStrategyIds ?? [],
      favoriteSignalIds: data?.favoriteSignalIds ?? [],
    };
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<ServerUser | null> {
  const user = await getServerUser();
  return user?.role === "admin" ? user : null;
}
