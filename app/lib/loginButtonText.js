const LEGACY_DEFAULT = "Talk to me now";
export const DEFAULT_LOGIN_BUTTON_TEXT = "Talk to me";

/**
 * Empty or legacy app default → current default. Does not change other custom copy.
 */
export function normalizeLoginButtonText(text) {
  const t = typeof text === "string" ? text.trim() : "";
  if (!t || t === LEGACY_DEFAULT) return DEFAULT_LOGIN_BUTTON_TEXT;
  return text;
}
