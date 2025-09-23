import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Logs from "@/app/models/ChatLogs";
import Session from "@/app/models/ChatSessions";
import { getToken } from "next-auth/jwt";
import { client as sanity } from "@/app/lib/sanity";

// GET /api/admin/session-logs/[sessionId]
// Returns chat logs for a specific session (admin only)
export async function GET(req, { params }) {
  try {
    await connectDB();

    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: "Missing sessionId parameter" },
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

    // Get the session to check brand
    const session = await Session.findById(sessionId).lean();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Session not found" },
        { status: 404 }
      );
    }

    // Check if user is admin for this brand
    const brandDoc = await sanity.fetch(
      `*[_type=="brand" && subdomain==$brand][0]{admins}`,
      { brand: session.brand }
    );

    const isAdmin = Array.isArray(brandDoc?.admins)
      ? brandDoc.admins.includes(requesterEmail)
      : false;

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Forbidden - not a brand admin" },
        { status: 403 }
      );
    }

    // Fetch logs for this session
    const logs = await Logs.find({ sessionId })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      logs: logs.map(log => ({
        _id: log._id,
        message: log.message,
        role: log.role,
        createdAt: log.createdAt,
      })),
      total: logs.length,
    });
  } catch (error) {
    console.error("Session logs API error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch session logs" },
      { status: 500 }
    );
  }
}
