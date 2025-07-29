import User from "@/app/models/Users";
import Session from "@/app/models/ChatSessions";
import { connectDB } from "@/app/lib/db";
import { NextResponse } from "next/server";
import Matches from "@/app/models/Matches";
import Connection from "@/app/models/Connection";

export async function GET(req) {
  try {
    await connectDB();

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
      ] = await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ profileType: "job_seeker" }),
        User.countDocuments({ profileType: "recruiter" }),
        Matches.countDocuments({}),
        Connection.countDocuments({}),
      ]);

      return NextResponse.json({
        success: true,
        counts: {
          totalUsers,
          jobSeekerCount,
          recruiterCount,
          matchesCount,
          connectionsCount,
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
      ] = await Promise.all([
        User.find({}).select("name email profileType"),
        User.countDocuments({}),
        User.countDocuments({ profileType: "job_seeker" }),
        User.countDocuments({ profileType: "recruiter" }),
        Matches.countDocuments({}),
        Connection.countDocuments({}),
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
