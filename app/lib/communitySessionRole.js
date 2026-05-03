/**
 * Community ChatSessions use role: job_seeker | recruiter | friends
 * (legacy rows may still say friend / jobseeker / dating — we normalize reads to friends).
 */

export function normalizeSessionRole(role) {
  const x = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (x === "jobseeker" || x === "job_seeker") return "job_seeker";
  if (x === "recruiter") return "recruiter";
  if (x === "friend" || x === "friends" || x === "dating") return "friends";
  return null;
}

export function counterpartSessionRole(role) {
  const n = normalizeSessionRole(role);
  if (!n) return null;
  if (n === "job_seeker") return "recruiter";
  if (n === "recruiter") return "job_seeker";
  if (n === "friends") return "friends";
  return null;
}

/** Values stored on DerivedProfile.type (same aliases as session.role). */
export function derivedProfileTypesForRole(normalized) {
  if (normalized === "job_seeker") return ["job_seeker", "jobseeker"];
  if (normalized === "recruiter") return ["recruiter"];
  if (normalized === "friends") return ["friends", "friend", "dating"];
  return [];
}

/** Mongo query on role/type: matches normalized role plus common legacy spellings. */
export function sessionRoleMatch(normalized) {
  if (normalized === "job_seeker") return /^(job_seeker|jobseeker)$/i;
  if (normalized === "recruiter") return /^recruiter$/i;
  if (normalized === "friends") return /^(friends|friend|dating)$/i;
  return /^$/;
}
