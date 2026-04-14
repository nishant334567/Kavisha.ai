/**
 * Hardcoded job_seeker opening — same as community "Find jobs" (not from Sanity).
 */
export const JOB_SEEKER_OPENING_MESSAGE =
  "Hello! Looking for a job? Beautiful! Tell me all about it and we'll see what can be done. :)";

export const JOB_SEEKER_CHAT_TITLE = "Looking for work";

/** Resolve Sanity service _key for job_seeker (fallback: first service). */
export function getJobSeekerServiceKey(services) {
  const list = Array.isArray(services) ? services : [];
  const service = list.find((s) => String(s?.name || "").toLowerCase() === "job_seeker");
  return service?._key ?? list[0]?._key ?? null;
}
