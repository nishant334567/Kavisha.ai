"use client";

export async function signOut() {
  try {
    await fetch("/api/logout", { method: "GET", credentials: "include" });
  } catch (error) {
    // Still redirect so user leaves the app
  } finally {
    window.location.href = "/";
  }
}
