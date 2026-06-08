"use client";

import { normalizeBrandHex } from "@/app/lib/brandTheme";

/**
 * Minimal typing indicator — three soft dots with a staggered wave.
 * Used by main ChatBox and embed widget while a reply is loading.
 */
export default function ChatThinkingRow({
  className = "",
  /** @deprecated Kept for call-site compatibility. */
  displayName: _displayName,
  /** @deprecated Kept for call-site compatibility. */
  brandSlug: _brandSlug,
  /** Raw hex from Sanity / theme API */
  primaryColor,
  /** @deprecated All variants render the same minimal dots. */
  variant: _variant = "minimal",
}) {
  const hex = normalizeBrandHex(primaryColor);

  return (
    <div
      className={`chat-thinking-dots ${className}`.trim()}
      style={hex ? { "--kc-accent": hex } : undefined}
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading reply</span>
      <span className="chat-thinking-dot" />
      <span className="chat-thinking-dot" />
      <span className="chat-thinking-dot" />
    </div>
  );
}
