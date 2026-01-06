"use client";

export async function signOut() {
  try {
    await fetch("/api/logout", { method: "GET" });
  } catch (error) {
  } finally {
    window.location.href = "/";
  }
}
