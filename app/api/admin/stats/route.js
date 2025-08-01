import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Connection from "@/app/models/Connection";
import User from "@/app/models/Users";
import Matches from "@/app/models/Matches";
import { NextResponse } from "next/server";
export async function GET(req) {
  await connectDB();
  const totalUser = await User.countDocuments({});
  const totalUserWithJobSeekers = await User.countDocuments({
    profileType: "job_seeker",
  });
  const totalUserWithRecruiter = totalUser - totalUserWithJobSeekers;
  const totalChatSessions = await Session.countDocuments({});
  const totalJobSeekerSession = await Session.countDocuments({
    role: "job_seeker",
  });
  const totalJobSeekerNotInitiated = await Session.aggregate([
    { $match: { role: "job_seeker" } },
    {
      $lookup: {
        from: "logs",
        localField: "_id",
        foreignField: "sessionId",
        as: "logs",
      },
    },
    {
      $match: {
        $expr: {
          $eq: [{ $size: "$logs" }, 1],
        },
      },
    },
    {
      $count: "total",
    },
  ]);
  const totalJobSeekerSessionInitiated = await Session.aggregate([
    {
      $match: {
        role: "job_seeker",
        allDataCollected: false,
      },
    },
    {
      $lookup: {
        from: "logs",
        localField: "_id",
        foreignField: "sessionId",
        as: "logs",
      },
    },
    {
      $match: {
        $expr: {
          $gt: [{ $size: "$logs" }, 1],
        },
      },
    },
    {
      $count: "total",
    },
  ]);
  const totalJobSeekerCompletedSession = await Session.countDocuments({
    allDataCollected: true,
    role: "job_seeker",
  });
  const totalRecruiterSession = totalChatSessions - totalJobSeekerSession;
  const totalRecruiterNotInitiated = await Session.aggregate([
    { $match: { role: "recruiter" } },
    {
      $lookup: {
        from: "logs",
        localField: "_id",
        foreignField: "sessionId",
        as: "logs",
      },
    },
    {
      $match: {
        $expr: {
          $eq: [{ $size: "$logs" }, 1],
        },
      },
    },
    {
      $count: "total",
    },
  ]);
  const totalRecruiterWithSessionInitiated = await Session.aggregate([
    {
      $match: {
        role: "recruiter",
        allDataCollected: false,
      },
    },
    {
      $lookup: {
        from: "logs",
        localField: "_id",
        foreignField: "sessionId",
        as: "logs",
      },
    },
    {
      $match: {
        $expr: {
          $gt: [{ $size: "$logs" }, 1],
        },
      },
    },
    {
      $count: "total",
    },
  ]);
  const totalRecruiterWithCompletedSession = await Session.countDocuments({
    allDataCollected: true,
    role: "recruiter",
  });
  const totalMatches = await Matches.countDocuments({});
  const totalConnections = await Connection.countDocuments({});

  return NextResponse.json({
    success: true,
    stats: {
      totalUser,
      totalUserWithJobSeekers,
      totalUserWithRecruiter,
      totalChatSessions,
      totalJobSeekerSession,
      totalJobSeekerNotInitiated: totalJobSeekerNotInitiated[0]?.total || 0,
      totalJobSeekerSessionInitiated:
        totalJobSeekerSessionInitiated[0]?.total || 0,
      totalJobSeekerCompletedSession,
      totalRecruiterSession,
      totalRecruiterNotInitiated: totalRecruiterNotInitiated[0]?.total || 0,
      totalRecruiterWithSessionInitiated:
        totalRecruiterWithSessionInitiated[0]?.total || 0,
      totalRecruiterWithCompletedSession,
      totalMatches,
      totalConnections,
    },
  });
}
