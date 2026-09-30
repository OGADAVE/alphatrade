// Usage: node scripts/set-admin-role.mjs someone@example.com
import { config } from "dotenv";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

config({ path: ".env.local" });

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/set-admin-role.mjs <email>");
  process.exit(1);
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Missing FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY in .env.local",
  );
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });

async function main() {
  const user = await getAuth().getUserByEmail(email);
  await getFirestore().collection("users").doc(user.uid).set({ role: "admin" }, { merge: true });
  console.log(`${email} (${user.uid}) is now an admin.`);
  console.log("They'll need to sign out and back in for the new session cookie to reflect it.");
}

main().then(() => process.exit(0));
