import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Server-side Firestore via the Firebase Admin SDK.
 *
 * Used by the background-job endpoints to persist job status out of band so the
 * client can poll it. Admin access bypasses security rules, which is why job
 * docs live in a server-only collection the client never writes to directly.
 *
 * Credentials:
 *   - On Firebase App Hosting / Cloud Run, Application Default Credentials (the
 *     runtime service account) are picked up automatically — no key needed.
 *   - Locally against the emulator, set FIRESTORE_EMULATOR_HOST (the Admin SDK
 *     then needs no real credentials).
 *   - Optionally, a FIREBASE_SERVICE_ACCOUNT env (JSON) is honored if present.
 */
let dbInstance = null;

export function adminDb() {
  if (dbInstance) return dbInstance;

  if (!getApps().length) {
    const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
    initializeApp({
      projectId:
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.GCLOUD_PROJECT ||
        "calories-88b0d",
      ...(svc ? { credential: cert(JSON.parse(svc)) } : {}),
    });
  }

  dbInstance = getFirestore();
  return dbInstance;
}
