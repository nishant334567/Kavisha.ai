/**
 * Public listings / match cards: show only the first letter of another member's name
 * (same rule as /api/community/sessions maskName).
 */
export function maskCommunityPeerName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "A";
  return raw.charAt(0).toUpperCase();
}
