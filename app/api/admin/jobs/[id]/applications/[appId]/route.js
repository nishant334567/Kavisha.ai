import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { connectDB } from "@/app/lib/db";
import Job from "@/app/models/Job";
import JobApplication from "@/app/models/JobApplication";
import User from "@/app/models/Users";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const ROOT_HOST = process.env.NODE_ENV === "staging" ? "staging.kavisha.ai" : "kavisha.ai";

function getValidatedStatus(status, job) {
  if (status === undefined || status === null) return null;
  const s = typeof status === "string" ? status.trim() : "";
  if (!s) return "";
  const categories = Array.isArray(job?.statusCategories) ? job.statusCategories : [];
  const match = categories.find((c) => (c || "").toLowerCase() === s.toLowerCase());
  return match !== undefined ? match : null;
}

async function toApplicationResponse(app) {
  let applicantUserId = null;
  if (app.applicantEmail) {
    const u = await User.findOne({ email: (app.applicantEmail || "").toLowerCase() }).select("_id").lean();
    applicantUserId = u?._id?.toString() || null;
  }
  return {
    _id: app._id,
    applicantEmail: app.applicantEmail,
    applicantName: app.applicantName || "",
    applicantImage: app.applicantImage || "",
    applicantUserId,
    status: app.status || "",
    starred: !!app.starred,
    assignedTo: Array.isArray(app.assignedTo) ? app.assignedTo : [],
    resumeLink: app.resumeLink,
    questionsAnswers: app.questionsAnswers || [],
    createdAt: app.createdAt,
    applicationSummary: app.applicationSummary || "",
  };
}

export async function GET(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const { id: jobId, appId } = await params;
      const brand = req.nextUrl.searchParams.get("brand")?.trim();
      if (!jobId || !appId || !brand) {
        return NextResponse.json(
          { error: "job id, application id and brand required" },
          { status: 400 }
        );
      }
      if (
        !mongoose.Types.ObjectId.isValid(jobId) ||
        !mongoose.Types.ObjectId.isValid(appId)
      ) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
      }
      const isAdmin = await isBrandAdmin(decodedToken.email, brand);
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await connectDB();
      const job = await Job.findOne({ _id: jobId, brand }).lean();
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      const application = await JobApplication.findOne({
        _id: appId,
        jobId,
      }).lean();
      if (!application) {
        return NextResponse.json(
          { error: "Application not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        job: {
          _id: job._id,
          title: job.title || "",
          description: job.description || "",
          jdLink: job.jdLink || "",
          statusCategories: Array.isArray(job.statusCategories) ? job.statusCategories : [],
        },
        application: await toApplicationResponse(application),
      });
    },
    onUnauthenticated: async () => {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    },
  });
}

export async function PATCH(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const { id: jobId, appId } = await params;
      const brand = req.nextUrl.searchParams.get("brand")?.trim();
      if (!jobId || !appId || !brand) {
        return NextResponse.json(
          { error: "job id, application id and brand required" },
          { status: 400 }
        );
      }
      if (
        !mongoose.Types.ObjectId.isValid(jobId) ||
        !mongoose.Types.ObjectId.isValid(appId)
      ) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
      }
      const isAdmin = await isBrandAdmin(decodedToken.email, brand);
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await connectDB();
      const job = await Job.findOne({ _id: jobId, brand }).lean();
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      const application = await JobApplication.findOne({
        _id: appId,
        jobId,
      }).lean();
      if (!application) {
        return NextResponse.json(
          { error: "Application not found" },
          { status: 404 }
        );
      }
      let body = {};
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
      const updates = {};
      if (body.status !== undefined) {
        const validated = getValidatedStatus(body.status, job);
        if (validated !== null) {
          updates.status = validated;
        }
      }
      if (body.assignedTo !== undefined) {
        const list = Array.isArray(body.assignedTo)
          ? body.assignedTo
          : typeof body.assignedTo === "string" && body.assignedTo.trim()
            ? [body.assignedTo.trim()]
            : [];
        updates.assignedTo = list
          .filter((e) => typeof e === "string" && e.trim())
          .map((e) => e.trim());
      }
      if (body.starred !== undefined) {
        updates.starred = !!body.starred;
      }
      if (Object.keys(updates).length === 0) {
        return NextResponse.json({
          success: true,
          application: { ...application, ...updates },
        });
      }
      const updated = await JobApplication.findByIdAndUpdate(
        appId,
        { $set: updates },
        { new: true, lean: true }
      );

      if (updates.assignedTo && resend && brand) {
        const applicantName = updated.applicantName || updated.applicantEmail || "An applicant";
        const applicationUrl = `https://${brand}.${ROOT_HOST}/admin/jobs/${jobId}/applications/${appId}?subdomain=${encodeURIComponent(brand)}`;
        const subject = "You have been assigned to a job application";
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #333; margin: 0;">Application assignment</h2>
            </div>
            <p style="line-height: 1.6; color: #555;">You have been assigned to review the application of <strong>${applicantName}</strong> for the job <strong>${job.title || "this role"}</strong>.</p>
            <p style="line-height: 1.6; color: #555;"><a href="${applicationUrl}" style="color: #004A4E; font-weight: 600;">View application</a></p>
            <p style="line-height: 1.6; color: #555;"><a href="${applicationUrl}">${applicationUrl}</a></p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 14px;">
              <p>Best regards,<br>The ${brand} Team</p>
            </div>
          </div>
        `;
        const emailsToNotify = Array.isArray(updates.assignedTo) ? updates.assignedTo : [];
        try {
          await Promise.all(
            emailsToNotify.map((to) =>
              resend.emails.send({
                from: "hello@kavisha.ai",
                to: [to],
                subject,
                html,
              })
            )
          );
        } catch (emailErr) {
          console.error("Assign application: email send failed", emailErr);
        }
      }

      return NextResponse.json({
        success: true,
        application: await toApplicationResponse(updated),
      });
    },
    onUnauthenticated: async () => {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    },
  });
}
