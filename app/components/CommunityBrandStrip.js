"use client";

/**
 * Full-width bar below the main navbar on community routes.
 * Shows community title only (entry actions live on /community main).
 */
export default function CommunityBrandStrip({
  communityName = "Community",
  primaryHex,
}) {
  return (
    <div
      className={`w-full shrink-0 border-b border-black/15 ${!primaryHex ? "bg-highlight" : ""}`}
      style={primaryHex ? { backgroundColor: primaryHex } : undefined}
    >
      <div className="flex w-full items-center justify-start px-4 py-2.5 sm:px-16 sm:py-3">
        <p className="text-left text-lg font-semibold uppercase leading-tight tracking-wide text-white sm:text-2xl">
          {communityName}
        </p>
      </div>
    </div>
  );
}
