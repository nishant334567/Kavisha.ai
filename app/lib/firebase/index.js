import { getApps, initializeApp, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import * as admin from "firebase-admin";

// ==============================================================
// 1. CLIENT-SIDE CONFIGURATION (Public, for the Browser)
// ==============================================================
export const clientConfig = {
  apiKey: "AIzaSyBqKeh__fy2fYBAjF4pccLOsIEEsyObN4Y",
  authDomain: "kavisha-ai-468913.firebaseapp.com",
  projectId: "kavisha-ai-468913",
  storageBucket: "kavisha-ai-468913.firebasestorage.app",
  messagingSenderId: "457323016405",
  appId: "1:457323016405:web:d40df23d56aa9cfad7325c",
  measurementId: "G-B80ZRME87J",
};

export function getFirebaseAuth() {
  if (getApps().length > 0) return getAuth(getApp());
  const app = initializeApp(clientConfig);
  return getAuth(app);
}

// ==============================================================
// 2. SERVER-SIDE CONFIGURATION (Private, for Admin Tasks)
// ==============================================================
// Re-export from config.js to avoid duplication
// Note: For middleware (Edge Runtime), import directly from "./config" instead
export { serverConfig } from "./config";

export function getAdminAuth() {
  if (admin.apps.length > 0) return admin.auth();

  const adminApp = admin.initializeApp({
    projectId: serverConfig.serviceAccount.projectId,
    credential: admin.credential.applicationDefault(),
  });

  return admin.auth(adminApp);
}
