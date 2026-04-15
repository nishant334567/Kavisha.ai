"use client";

/**
 * Full-width bar below the main navbar on community routes.
 * Uses primary brand color when set; otherwise theme default (highlight).
 */
export default function CommunityBrandStrip({
  communityName = "Community",
  primaryHex,
  secondaryHex,
  enableProfessionalConnect = false,
  enableFriendConnect = false,
  creating = null,
  onFindJobs,
  onHirePeople,
  onFindFriends,
}) {
  const showJobs = enableProfessionalConnect && typeof onFindJobs === "function";
  const showHire = enableProfessionalConnect && typeof onHirePeople === "function";
  const showFriends = enableFriendConnect && typeof onFindFriends === "function";
  const hasNav = showJobs || showHire || showFriends;

  const linkClassPlain =
    "text-left text-xs uppercase tracking-wide text-white/95 transition-opacity hover:opacity-85 disabled:opacity-45 sm:text-lg";
  const linkClassBranded =
    "rounded-full bg-white px-3 py-1.5 text-left text-xs uppercase tracking-wide text-black shadow-sm transition-opacity hover:opacity-90 disabled:opacity-45 sm:px-4 sm:py-1 sm:text-lg";
  const brandedNavTextStyle =
    primaryHex && secondaryHex ? { color: secondaryHex } : undefined;

  return (
    <div
      className={`w-full shrink-0 border-b border-black/15 ${!primaryHex ? "bg-highlight" : ""}`}
      style={primaryHex ? { backgroundColor: primaryHex } : undefined}
    >
      {/* px-4 matches desktop Navbar inner (`px-4 h-14`) so title lines up with brand logo */}
      <div className="flex w-full flex-col gap-3 px-4 sm:px-16 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:py-3">
        <p className="text-lg font-semibold uppercase leading-tight tracking-wide text-white sm:text-xl">
          {communityName}
        </p>
        {hasNav ? (
          <nav
            className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4 md:gap-x-5"
            aria-label="Community shortcuts"
          >
            {showJobs ? (
              <button
                type="button"
                className={primaryHex ? linkClassBranded : linkClassPlain}
                style={primaryHex ? brandedNavTextStyle : undefined}
                disabled={creating === "job_seeker"}
                onClick={onFindJobs}
              >
                {creating === "job_seeker" ? "Starting…" : "Find jobs"}
              </button>
            ) : null}
            {showHire ? (
              <button
                type="button"
                className={primaryHex ? linkClassBranded : linkClassPlain}
                style={primaryHex ? brandedNavTextStyle : undefined}
                disabled={creating === "recruiter"}
                onClick={onHirePeople}
              >
                {creating === "recruiter" ? "Starting…" : "Hire people"}
              </button>
            ) : null}
            {showFriends ? (
              <button
                type="button"
                className={primaryHex ? linkClassBranded : linkClassPlain}
                style={primaryHex ? brandedNavTextStyle : undefined}
                disabled={creating === "friends"}
                onClick={onFindFriends}
              >
                {creating === "friends" ? "Starting…" : "Find friends"}
              </button>
            ) : null}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
