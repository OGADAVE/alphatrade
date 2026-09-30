import "server-only";
import { adminDb } from "./firebase-admin";
import type { AppUser, AuditLogEntry, SignalSource } from "./types";

export async function getSignalSources(): Promise<SignalSource[]> {
  const snap = await adminDb().collection("signal_sources").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SignalSource);
}

export async function getUsers(): Promise<AppUser[]> {
  const snap = await adminDb().collection("users").orderBy("createdAt", "desc").limit(200).get();
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as AppUser);
}

export async function getAuditLog(limit = 100): Promise<AuditLogEntry[]> {
  const snap = await adminDb().collection("audit_logs").orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditLogEntry);
}
