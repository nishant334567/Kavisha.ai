// Client-side only Firebase configuration (no Node.js dependencies)
// Safe to import in client components and Edge Runtime
import { getApps, initializeApp, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

export const clientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function getFirebaseAuth() {
  // Runtime validation with helpful error
  if (!clientConfig.apiKey || clientConfig.apiKey === "undefined") {
    // Debug info for production troubleshooting
    const debugInfo = {
      apiKey: clientConfig.apiKey,
      apiKeyType: typeof clientConfig.apiKey,
      apiKeyLength: clientConfig.apiKey?.length,
      allEnvVars: {
        apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      },
    };
    console.error("Firebase config debug:", debugInfo);
    throw new Error(
      `Firebase API key is missing or invalid. ` +
        `API Key: ${clientConfig.apiKey?.substring(0, 10)}... (length: ${clientConfig.apiKey?.length || 0}). ` +
        `Please set NEXT_PUBLIC_FIREBASE_API_KEY in your environment variables at BUILD time.`
    );
  }

  if (getApps().length > 0) return getAuth(getApp());
  const app = initializeApp(clientConfig);
  return getAuth(app);
}
