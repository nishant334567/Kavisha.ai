function escapeIcs(s) {
  if (!s) return "";
  return String(s)
    .replace(/\\/g, "\\\\") // backslash first, so we don't double-escape
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

const DEFAULT_TZ = "Asia/Kolkata";
function buildIcsEvent(opts, timezone = DEFAULT_TZ) {
  const {
    title,
    date,
    startTime,
    endTime,
    description = "",
    location = "",
  } = opts || {};

  const d = (date || "").replace(/-/g, "");
  const start = d + "T" + (startTime || "00:00").replace(":", "") + "00";
  const end = d + "T" + (endTime || "00:30").replace(":", "") + "00";

  const uid = `evt-${d}-${start}-${Math.random().toString(36).slice(2, 10)}@kavisha`;
  const now = new Date();
  const dtstamp =
    now.getUTCFullYear() +
    String(now.getUTCMonth() + 1).padStart(2, "0") +
    String(now.getUTCDate()).padStart(2, "0") +
    "T" +
    String(now.getUTCHours()).padStart(2, "0") +
    String(now.getUTCMinutes()).padStart(2, "0") +
    String(now.getUTCSeconds()).padStart(2, "0") +
    "Z";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kavisha.ai//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=${timezone}:${start}`, // Start in given timezone (e.g. Asia/Kolkata)
    `DTEND;TZID=${timezone}:${end}`,
    `SUMMARY:${escapeIcs(title || "Booking")}`,
  ];
  if (description) lines.push(`DESCRIPTION:${escapeIcs(description)}`);
  if (location) lines.push(`LOCATION:${escapeIcs(location)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export { buildIcsEvent };
