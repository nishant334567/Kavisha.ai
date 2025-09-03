import User from "@/app/models/Users";
import Session from "@/app/models/ChatSessions";
import { connectDB } from "@/app/lib/db";
import { NextResponse } from "next/server";
import Matches from "@/app/models/Matches";
import Connection from "@/app/models/Connection";
import { getToken } from "next-auth/jwt";
import { client as sanity } from "@/app/lib/sanity";

export async function GET(req) {
  try {
    await connectDB();

    // Authorization: Only admins of brand "kavisha" may access
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    const requesterEmail = token?.email || token?.user?.email;
    if (!requesterEmail) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const brandDoc = await sanity.fetch(
      `*[_type=="brand" && subdomain=="kavisha"][0]{admins}`
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

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const countsOnly = searchParams.get("countsOnly") === "true";

    if (countsOnly) {
      // Efficient counting using countDocuments() - for dashboard stats only
      const [
        totalUsers,
        jobSeekerCount,
        recruiterCount,
        matchesCount,
        connectionsCount,
        allDataCollectedCount,
        allSessionCount,
      ] = await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ profileType: "job_seeker" }),
        User.countDocuments({ profileType: "recruiter" }),
        Matches.countDocuments({}),
        Connection.countDocuments({}),
        Session.countDocuments({ allDataCollected: true }),
        Session.countDocuments({}),
      ]);

      return NextResponse.json({
        success: true,
        counts: {
          totalUsers,
          jobSeekerCount,
          recruiterCount,
          matchesCount,
          connectionsCount,
          allDataCollectedCount,
          allSessionCount,
        },
      });
    } else {
      // Single API call that returns both counts and full data
      const [
        users,
        totalUsers,
        jobSeekerCount,
        recruiterCount,
        matchesCount,
        connectionsCount,
        allDataCollectedCount,
        allSessionCount,
      ] = await Promise.all([
        User.find({}).select("name email profileType"),
        User.countDocuments({}),
        User.countDocuments({ profileType: "job_seeker" }),
        User.countDocuments({ profileType: "recruiter" }),
        Matches.countDocuments({}),
        Connection.countDocuments({}),
        Session.countDocuments({ allDataCollected: true }),
        Session.countDocuments({}),
      ]);

      const usersWithSessions = await Promise.all(
        users.map(async (user) => {
          const chatSessionData = await Session.find({
            userId: user._id,
          }).select("title _id createdAt updatedAt");
          return {
            id: user._id,
            name: user.name,
            email: user.email,
            profileType: user.profileType,
            sessions: chatSessionData,
          };
        })
      );

      return NextResponse.json({
        success: true,
        counts: {
          totalUsers,
          jobSeekerCount,
          recruiterCount,
          matchesCount,
          connectionsCount,
          allDataCollectedCount,
          allSessionCount,
        },
        users: usersWithSessions,
      });
    }
  } catch (err) {
    console.error("Admin users API error:", err);
    return NextResponse.json({
      success: false,
      message: "Failed to fetch admin data",
    });
  }
}
