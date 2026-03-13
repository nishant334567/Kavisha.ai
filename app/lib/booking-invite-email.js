import { connectDB } from "@/app/lib/db";
import { client as sanityClient } from "@/app/lib/sanity";
import User from "@/app/models/Users";
import BookingAppointment from "@/app/models/BookingAppointment";
import { sendEmail } from "@/app/lib/email";
import { buildIcsEvent } from "@/app/lib/calender-invite";
import { createCalendarEventWithMeet } from "@/app/lib/google-calendar-meet";
import mongoose from "mongoose";

const FROM = "Kavisha <hello@kavisha.ai>";

/**
 * Get customer and brand admin emails for a booking.
 * @param {Object} appointment - { customerId, brand }
 * @returns {Promise<{ customerEmail?: string, customerName?: string, adminEmails: string[] }>}
 */
export async function getBookingInviteRecipients(appointment) {
    const result = { customerEmail: undefined, customerName: undefined, adminEmails: [] };
    if (!appointment?.customerId || !appointment?.brand) return result;

    await connectDB();

    const [user, brandDoc] = await Promise.all([
        User.findById(appointment.customerId).select("email name").lean(),
        sanityClient?.fetch(
            `*[_type == "brand" && subdomain == $brand][0]{ admins }`,
            { brand: appointment.brand }
        ),
    ]);

    if (user?.email) {
        result.customerEmail = user.email;
        result.customerName = user.name || undefined;
    }
    if (Array.isArray(brandDoc?.admins)) {
        result.adminEmails = brandDoc.admins.filter((e) => typeof e === "string" && e.trim());
    }
    return result;
}

/**
 * Send booking confirmation email with .ics calendar invite to customer and brand admins.
 * @param {Object} appointment - { date, startTime, endTime, serviceSnapshot: { title, mode } }
 * @param {{ email?: string, name?: string }} customer
 * @param {string[]} adminEmails
 */
export async function sendBookingCalendarInvite(appointment, customer, adminEmails) {
    const snapshot = appointment?.serviceSnapshot || {};
    const title = snapshot.title || "Booking";
    const date = appointment?.date || "";
    const startTime = appointment?.startTime || "";
    const endTime = appointment?.endTime || "";
    const mode = snapshot.mode || "Online (Google Meet)";

    const { meetLink } = await createCalendarEventWithMeet({
        title,
        date,
        startTime,
        endTime,
        description: `${title}. Mode: ${mode}.`,
    });
    if (meetLink) {
        const appointmentId = appointment?._id ?? appointment?.id;
        if (appointmentId) {
            await connectDB();
            await BookingAppointment.updateOne(
                { _id: new mongoose.Types.ObjectId(String(appointmentId)) },
                { $set: { meetLink } }
            );
        }
    }
    const locationText = meetLink || "Meeting link will be shared by the host";

    const icsContent = buildIcsEvent({
        title,
        date,
        startTime,
        endTime,
        description: meetLink ? `${title}. Mode: ${mode}. Join: ${meetLink}` : `${title}. Mode: ${mode}. ${locationText}`,
        location: locationText,
    });
    const attachment = {
        filename: "invite.ics",
        content: Buffer.from(icsContent, "utf-8"),
    };

    const customerEmail = customer?.email?.trim();
    const customerName = customer?.name || "Customer";
    const adminList = Array.isArray(adminEmails) ? adminEmails.filter((e) => typeof e === "string" && e.trim()) : [];

    const meetLinkHtml = meetLink
        ? `<p><strong>Join the meeting:</strong> <a href="${meetLink}">${meetLink}</a></p>`
        : `<p>${locationText}</p>`;

    const customerBody = `
      <p>Hi ${customerName || "there"},</p>
      <p>Your booking is confirmed.</p>
      <p><strong>${title}</strong></p>
      <p>Date: ${date} at ${startTime} – ${endTime}</p>
      <p>Mode: ${mode}.</p>
      ${meetLinkHtml}
      <p>Save to your calendar: open the attached <strong>invite.ics</strong> file, or add the event from your email client.</p>
    `;

    const adminBody = `
      <p>New booking confirmed.</p>
      <p><strong>${title}</strong> with ${customerName || "the customer"}.</p>
      <p>Date: ${date} at ${startTime} – ${endTime}</p>
      <p>Mode: ${mode}.</p>
      ${meetLinkHtml}
      <p>Calendar invite is attached.</p>
    `;

    const sendOpts = { from: FROM, attachments: [attachment] };
    const promises = [];

    if (customerEmail) {
        promises.push(
            sendEmail({
                ...sendOpts,
                to: customerEmail,
                subject: `Booking confirmed: ${title}`,
                body: customerBody,
            })
        );
    }
    for (const adminEmail of adminList) {
        promises.push(
            sendEmail({
                ...sendOpts,
                to: adminEmail,
                subject: `New booking: ${title} with ${customerName || "customer"}`,
                body: adminBody,
            })
        );
    }
    if (promises.length > 0) {
        await Promise.all(promises);
    }
}
