import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Verify the caller's Firebase ID token on a Route Handler.
 *
 * Without this, /api/chat-log is an open proxy to Gemini: anyone who finds the
 * URL can spend the project's quota. Moving the API key off the client only
 * helps if the endpoint that holds it isn't itself freely callable.
 *
 * Credentials resolve the same way as firebaseAdmin.js — ADC on App Hosting,
 * FIREBASE_AUTH_EMULATOR_HOST locally (the Admin SDK skips signature checks
 * against the emulator, so emulator sign-ins verify fine in development).
 */

function ensureApp() {
  if (getApps().length) return;
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  initializeApp({
    projectId:
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      "calories-88b0d",
    ...(svc ? { credential: cert(JSON.parse(svc)) } : {}),
  });
}

/**
 * @returns {Promise<{ uid: string } | { error: string, status: number }>}
 */
export async function requireUser(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) {
    return { error: "Not signed in.", status: 401 };
  }

  try {
    ensureApp();
    const decoded = await getAuth().verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    return { error: "Your session expired. Please sign in again.", status: 401 };
  }
}
