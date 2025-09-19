import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";

export async function GET() {
  try {
    await connectDB();

    // Find sessions that don't have a status field or have null/undefined status
    const sessionsWithoutStatus = await Session.find({
      $or: [{ status: { $exists: false } }, { status: null }, { status: "" }],
    });

    const count = sessionsWithoutStatus.length;

    if (count === 0) {
      return NextResponse.json({
        success: true,
        message: "No sessions found without status field",
        updated: 0,
      });
    }

    // Update all sessions without status to "in-progress"
    const updateResult = await Session.updateMany(
      {
        $or: [{ status: { $exists: false } }, { status: null }, { status: "" }],
      },
      {
        $set: { status: "in-progress" },
      }
    );

    // Verify the update was successful
    const remainingSessionsWithoutStatus = await Session.countDocuments({
      $or: [{ status: { $exists: false } }, { status: null }, { status: "" }],
    });

    // Get total session count for reference
    const totalSessions = await Session.countDocuments({});

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updateResult.modifiedCount} sessions to 'in-progress' status`,
      updated: updateResult.modifiedCount,
      totalFound: count,
      remainingWithoutStatus: remainingSessionsWithoutStatus,
      totalSessions: totalSessions,
      allUpdated: remainingSessionsWithoutStatus === 0,
    });
  } catch (error) {
    console.error("Error updating session statuses:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update session statuses",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
