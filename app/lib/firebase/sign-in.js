"use client";

import { getFirebaseAuth } from "./client";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

/**
 * Client-side sign-in helper
 */
export async function signIn() {
  const auth = getFirebaseAuth();
  const userCredential = await signInWithPopup(auth, new GoogleAuthProvider());
  const idToken = await userCredential.user.getIdToken();

  const res = await fetch("/api/login", {
    method: "GET",
    headers: { Authorization: `Bearer ${idToken}` },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to create session");
  }

  await new Promise((resolve) => setTimeout(resolve, 100));

  return res.json();
}
