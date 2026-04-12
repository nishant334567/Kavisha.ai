import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { serverConfig } from "./config";

/**
 * Lazily initialized Firebase Admin Auth (Node routes only).
 */
export function getAdminAuth() {
  const { projectId, clientEmail, privateKey } = serverConfig.serviceAccount;
  if (!projectId || !clientEmail || !privateKey) {
    const err = new Error(
      "Firebase Admin not configured (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)"
    );
    err.code = "admin_not_configured";
    throw err;
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return getAuth();
}

/**
 * @param {string} email
 * @param {string} [displayName]
 */
export async function getOrCreateUserByEmail(email, displayName) {
  const auth = getAdminAuth();
  try {
    return await auth.getUserByEmail(email);
  } catch (e) {
    if (e?.code !== "auth/user-not-found") throw e;
  }

  try {
    return await auth.createUser({
      email,
      emailVerified: true,
      ...(displayName ? { displayName } : {}),
    });
  } catch (e) {
    if (e?.code === "auth/email-already-exists") {
      return auth.getUserByEmail(email);
    }
    throw e;
  }
}
