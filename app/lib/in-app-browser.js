/**
 * Shared in-app browser detection and handling (e.g. Facebook, Instagram in-app browsers).
 * Used by login page, homepage, navbar, footer, and make-avatar so sign-in is handled the same way.
 */

export const IN_APP_BROWSER_PATTERNS = [
  /FBAN|FBAV/i, // Facebook
  /Instagram/i, // Instagram
  /Twitter/i, // Twitter
  /LinkedInApp/i, // LinkedIn
  /;fb|;iab/i, // Facebook in-app browser
];

export const LEGITIMATE_BROWSER_PATTERNS = {
  SAFARI: /Safari/i,
  VERSION: /Version/i,
  CHROME: /Chrome\//i,
  SAMSUNG: /SamsungBrowser/i,
  WEBVIEW: /wv/i,
  IOS_CHROME: /CriOS/i,
};

export function isMobileDevice() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod|Android/i.test(ua);
}

export function detectInAppBrowser() {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /Android/.test(ua);

  if (IN_APP_BROWSER_PATTERNS.some((pattern) => pattern.test(ua))) {
    return true;
  }

  if (isAndroid) {
    const isWebView =
      LEGITIMATE_BROWSER_PATTERNS.WEBVIEW.test(ua) &&
      !LEGITIMATE_BROWSER_PATTERNS.CHROME.test(ua);
    const isLegitimate =
      LEGITIMATE_BROWSER_PATTERNS.CHROME.test(ua) ||
      LEGITIMATE_BROWSER_PATTERNS.SAMSUNG.test(ua);
    return !isLegitimate && isWebView;
  }

  if (isIOS) {
    const isLegitimateIOSBrowser =
      ((LEGITIMATE_BROWSER_PATTERNS.SAFARI.test(ua) &&
        LEGITIMATE_BROWSER_PATTERNS.VERSION.test(ua)) ||
        LEGITIMATE_BROWSER_PATTERNS.IOS_CHROME.test(ua)) &&
      !IN_APP_BROWSER_PATTERNS.some((pattern) => pattern.test(ua));
    if (isLegitimateIOSBrowser) return false;
    return (
      typeof window.safari === "undefined" && navigator.standalone !== true
    );
  }

  return false;
}

export function openInChrome() {
  if (typeof window === "undefined") return;
  try {
    const currentUrl = window.location.href;
    const chromeUrl = `googlechrome://${currentUrl.replace(/^https?:\/\//, "")}`;
    window.location.href = chromeUrl;
  } catch (_) {
    window.open(window.location.href, "_blank");
  }
}
