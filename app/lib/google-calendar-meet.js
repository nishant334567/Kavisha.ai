import { google } from "googleapis";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
const DEFAULT_TZ = "Asia/Kolkata";

/**
 * Create a Google Calendar client using service account credentials from env.
 * Uses GCP_CLIENT_EMAIL and GCP_PRIVATE_KEY. If GOOGLE_CALENDAR_IMPERSONATE_USER
 * is set (e.g. hello@kavisha.ai), uses JWT with subject so events and Meet links
 * are created on that user's calendar (requires domain-wide delegation).
 */
function getCalendarClient() {
  const clientEmail = process.env.GCP_CLIENT_EMAIL;
  const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) return null;
  const subject = process.env.GOOGLE_CALENDAR_IMPERSONATE_USER?.trim() || null;
  const auth = subject
    ? new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: [CALENDAR_SCOPE],
        subject,
      })
    : new google.auth.GoogleAuth({
        credentials: { client_email: clientEmail, private_key: privateKey },
        scopes: [CALENDAR_SCOPE],
      });
  return google.calendar({ version: "v3", auth });
}

/**
 * Create a calendar event with a Google Meet link. When GOOGLE_CALENDAR_IMPERSONATE_USER
 * is set, the event is created on that user's primary calendar (and Meet link is returned).
 * @param {Object} opts - { title, description?, date (YYYY-MM-DD), startTime (HH:MM), endTime (HH:MM), timeZone? }
 * @returns {Promise<{ meetLink: string | null, error?: string }>}
 */
export async function createCalendarEventWithMeet(opts) {
  const calendar = getCalendarClient();
  if (!calendar) {
    return {
      meetLink: null,
      error: "Calendar API not configured (GCP_CLIENT_EMAIL / GCP_PRIVATE_KEY)",
    };
  }
  const {
    title,
    description = "",
    date,
    startTime,
    endTime,
    timeZone = DEFAULT_TZ,
  } = opts || {};
  if (!date || !startTime || !endTime) {
    return { meetLink: null, error: "Missing date or time" };
  }
  const startDateTime = `${date}T${startTime}:00`;
  const endDateTime = `${date}T${endTime}:00`;
  const requestId = `kavisha-${date}-${startTime}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    const res = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      requestBody: {
        summary: title || "Booking",
        description: description || undefined,
        start: { dateTime: startDateTime, timeZone },
        end: { dateTime: endDateTime, timeZone },
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });
    const meetLink =
      res.data.hangoutLink ||
      res.data.conferenceData?.entryPoints?.find(
        (e) => e.entryPointType === "video",
      )?.uri ||
      null;
    return { meetLink };
  } catch (err) {
    console.error("Google Calendar Meet creation failed:", err?.message || err);
    return { meetLink: null, error: err?.message || "Calendar API error" };
  }
}
