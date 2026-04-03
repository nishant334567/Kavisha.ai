const IST_OPTIONS = { timeZone: "Asia/Kolkata" };

function parseDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Full date and time in India Standard Time (no double offset — use only the IANA zone). */
export function formatToIST(dateString) {
  const date = parseDate(dateString);
  if (!date) return "N/A";
  return date.toLocaleString("en-IN", {
    ...IST_OPTIONS,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDateIST(dateString) {
  const date = parseDate(dateString);
  if (!date) return "";
  return date.toLocaleDateString("en-IN", {
    ...IST_OPTIONS,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTimeOnlyIST(dateString) {
  const date = parseDate(dateString);
  if (!date) return "—";
  return date.toLocaleString("en-IN", {
    ...IST_OPTIONS,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
