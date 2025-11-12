"use client";

export async function signOut() {
  try {
    await fetch("/api/logout", { method: "GET" });
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    window.location.href = "/login";
  }
}
