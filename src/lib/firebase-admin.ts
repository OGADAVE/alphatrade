import "server-only";
import { getApps, getApp, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

// Requires three server-only env vars (never prefixed NEXT_PUBLIC_, never
// sent to the browser): FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL,
// FIREBASE_ADMIN_PRIVATE_KEY. Get these from Firebase Console -> Project
// Settings -> Service accounts -> Generate new private key.
//
// Every function below is defensive: if the admin credentials aren't
// configured yet (e.g. mid-setup), calls throw a clear error instead of a
// confusing SDK stack trace, and callers (see signals-data.ts) fall back to
// mock data rather than crashing the page.

let cachedApp: App | null = null;

function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  if (getApps().length) {
    cachedApp = getApp();
    return cachedApp;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials are not configured. Set FIREBASE_ADMIN_PROJECT_ID, " +
        "FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in your environment.",
    );
  }

  cachedApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return cachedApp;
}

let cachedDb: Firestore | null = null;

export function adminDb(): Firestore {
  if (cachedDb) return cachedDb;
  cachedDb = getFirestore(getAdminApp());
  // Without this, writing ANY object with an undefined-valued field (e.g.
  // `note: undefined` when a webhook payload omits a note, or
  // `activatedAt: undefined` on a draft signal) throws instead of simply
  // omitting that field — a real bug this fixes once, globally, rather
  // than requiring every call site to manually strip undefined keys.
  // Must be set before any other Firestore operation on this instance.
  cachedDb.settings({ ignoreUndefinedProperties: true });
  return cachedDb;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  );
}