import "server-only";
import { adminDb } from "./firebase-admin";
import type { AuditLogEntry } from "./types";

export async function logAdminAction(entry: Omit<AuditLogEntry, "id" | "createdAt">): Promise<void> {
  await adminDb()
    .collection("audit_logs")
    .add({ ...entry, createdAt: new Date().toISOString() });
}
