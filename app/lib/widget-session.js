"use client";

import { clientConfig } from "@/app/lib/firebase/client";

/** Must match `source` in `/widget-auth` postMessage payload. */
export const WIDGET_AUTH_POSTMESSAGE_SOURCE = "kavisha-widget-auth";

const STORAGE_KEY = "kavisha:widget:auth/v1";
const REFRESH_LEEWAY_MS = 60 * 1000;

let memorySession = null;
let inflightRefresh = null;
const subscribers = new Set();

function notify() {
  for (const cb of subscribers) {
    try {
      cb(memorySession);
    } catch {}
  }
}

function readSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.idToken || !parsed?.refreshToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(session) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {}
}

function clearStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

async function refreshIdToken(refreshToken) {
  const apiKey = clientConfig.apiKey;
  if (!apiKey) throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY");
  const res = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Token refresh failed: ${res.status} ${text}`);
    err.code = "refresh_failed";
    throw err;
  }
  const data = await res.json();
  const expiresInSec = Number(data.expires_in || 0);
  return {
    idToken: data.id_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + expiresInSec * 1000,
  };
}

function setMemorySession(session) {
  memorySession = session;
  if (session) writeSession(session);
  else clearStorage();
  notify();
}

function loadInitial() {
  if (memorySession) return memorySession;
  memorySession = readSession();
  return memorySession;
}

async function getValidIdToken() {
  const session = loadInitial();
  if (!session) return null;

  const expiresAt = Number(session.expiresAt || 0);
  const stillFresh = expiresAt && Date.now() + REFRESH_LEEWAY_MS < expiresAt;
  if (stillFresh) return session.idToken;

  if (!inflightRefresh) {
    inflightRefresh = (async () => {
      try {
        const refreshed = await refreshIdToken(session.refreshToken);
        const next = { ...session, ...refreshed };
        setMemorySession(next);
        return next.idToken;
      } catch (e) {
        if (e?.code === "refresh_failed") setMemorySession(null);
        throw e;
      } finally {
        inflightRefresh = null;
      }
    })();
  }
  return inflightRefresh;
}

/** Persist tokens from `/widget-auth` postMessage (shape from `buildAuthPayload` there). */
export function commitWidgetAuth(payload) {
  if (!payload?.idToken || !payload?.refreshToken) return;
  setMemorySession({
    idToken: payload.idToken,
    refreshToken: payload.refreshToken,
    expiresAt: Number(payload.expiresAt) || Date.now() + 55 * 60 * 1000,
    user: payload.user || null,
  });
}

export function clearWidgetAuth() {
  setMemorySession(null);
}

export function getCurrentWidgetUser() {
  return loadInitial()?.user || null;
}

/** Subscribe to widget session changes; callback receives full session or null. */
export function subscribeWidgetSession(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

/**
 * If widget tokens exist: `Authorization: Bearer` + `credentials: "omit"`.
 * Otherwise: cookie session via `credentials: "include"`.
 */
export async function widgetAwareFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  let token;
  try {
    token = await getValidIdToken();
  } catch {
    token = null;
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
    let res = await fetch(url, { ...options, headers, credentials: "omit" });
    if (res.status === 401 && memorySession) {
      try {
        memorySession = { ...memorySession, expiresAt: 0 };
        const fresh = await getValidIdToken();
        if (fresh) {
          const h = new Headers(options.headers || {});
          h.set("Authorization", `Bearer ${fresh}`);
          res = await fetch(url, { ...options, headers: h, credentials: "omit" });
        }
        if (res.status === 401) setMemorySession(null);
      } catch {
        setMemorySession(null);
      }
    }
    return res;
  }

  return fetch(url, { ...options, headers: options.headers, credentials: "include" });
}
