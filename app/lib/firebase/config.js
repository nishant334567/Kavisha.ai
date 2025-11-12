// Edge-compatible Firebase auth config (no Node.js dependencies)
export const serverConfig = {
  cookieName: "__session",
  cookieSignatureKeys: [
    process.env.COOKIE_SIGNATURE_KEY_1,
    process.env.COOKIE_SIGNATURE_KEY_2,
  ],
  apiKey: process.env.FIREBASE_API_KEY,
  serviceAccount: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
};
