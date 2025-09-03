import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import User from "@/app/models/Users";
import { getToken } from "next-auth/jwt";
import { client as sanity } from "@/app/lib/sanity";

// GET /api/admin/overview/[brand]
// Returns brand-scoped metrics for non-"kavisha" brands, using dynamic route param
export async function GET(req, { params }) {
  try {
    await connectDB();

    const brand = (params?.brand || "").trim().toLowerCase();

    if (!brand) {
      return NextResponse.json(
        { success: false, message: "Missing 'brand' query parameter" },
        { status: 400 }
      );
    }
    if (brand === "kavisha") {
      return NextResponse.json(
        {
          success: false,
          message: "This endpoint is intended for non-'kavisha' brands",
        },
        { status: 400 }
      );
    }

    // Authorization: only brand admins may access
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    const requesterEmail = token?.email || token?.user?.email;
    if (!requesterEmail) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const brandDoc = await sanity.fetch(
      `*[_type=="brand" && subdomain==$brand][0]{admins}`,
      { brand }
    );
    const isAdmin = Array.isArray(brandDoc?.admins)
      ? brandDoc.admins.includes(requesterEmail)
      : false;
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    // Core counts for the brand
    const [
      jobSeekerSessions,
      jobSeekerAllDataSessions,
      recruiterSessions,
      recruiterAllDataSessions,
      distinctJobSeekerUsers,
      distinctRecruiterUsers,
      allSessionsCount,
      allAllDataCount,
    ] = await Promise.all([
      Session.countDocuments({ brand, role: "job_seeker" }),
      Session.countDocuments({
        brand,
        role: "job_seeker",
        allDataCollected: true,
      }),
      Session.countDocuments({ brand, role: "recruiter" }),
      Session.countDocuments({
        brand,
        role: "recruiter",
        allDataCollected: true,
      }),
      // Distinct users who have job_seeker sessions in this brand
      Session.distinct("userId", { brand, role: "job_seeker" }).then(
        (ids) => ids.length
      ),
      // Distinct users who have recruiter sessions in this brand
      Session.distinct("userId", { brand, role: "recruiter" }).then(
        (ids) => ids.length
      ),
      // Overall sessions
      Session.countDocuments({ brand }),
      Session.countDocuments({ brand, allDataCollected: true }),
    ]);

    // Fetch job_seeker sessions with minimal fields and user info
    const jobSeekerSessionList = await Session.find({
      brand,
      role: "job_seeker",
    })
      .select("chatSummary allDataCollected userId")
      .populate("userId", "name email")
      .lean();

    const jobSeekerAllSessions = Array.isArray(jobSeekerSessionList)
      ? jobSeekerSessionList.map((s) => ({
          chatSummary: s.chatSummary || "",
          allDataCollected: !!s.allDataCollected,
          name: s.userId?.name || "",
          email: s.userId?.email || "",
        }))
      : [];

    const payload = {
      success: true,
      brand,
      counts: {
        jobSeeker: {
          users: distinctJobSeekerUsers,
          sessions: jobSeekerSessions,
          allDataCollected: jobSeekerAllDataSessions,
        },
        recruiter: {
          users: distinctRecruiterUsers,
          sessions: recruiterSessions,
          allDataCollected: recruiterAllDataSessions,
        },
        sessions: {
          total: allSessionsCount,
          allDataCollected: allAllDataCount,
        },
      },
      jobSeekerAllSessions: jobSeekerAllSessions,
    };
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Brand overview API error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch brand overview" },
      { status: 500 }
    );
  }
}
