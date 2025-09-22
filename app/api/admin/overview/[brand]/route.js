import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import { getToken } from "next-auth/jwt";
import { client as sanity } from "@/app/lib/sanity";

// GET /api/admin/overview/[brand]
// Returns all sessions for the specified brand (admin only)
export async function GET(req, { params }) {
  try {
    await connectDB();

    const brand = (params?.brand || "").trim().toLowerCase();

    if (!brand) {
      return NextResponse.json(
        { success: false, message: "Missing brand parameter" },
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

    // Check if user is admin for this brand
    const brandDoc = await sanity.fetch(
      `*[_type=="brand" && subdomain==$brand][0]{admins}`,
      { brand }
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

    // Fetch all sessions for this brand
    const sessions = await Session.find({ brand })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // Format sessions data
    const formattedSessions = sessions.map((session) => ({
      _id: session._id,
      brand: session.brand,
      role: session.role,
      status: session.status,
      title: session.title,
      chatSummary: session.chatSummary || "",
      allDataCollected: !!session.allDataCollected,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      assignedTo: session.assignedTo,
      user: {
        name: session.userId?.name || "",
        email: session.userId?.email || "",
      },
    }));

    return NextResponse.json({
      success: true,
      brand,
      sessions: formattedSessions,
      total: formattedSessions.length,
    });
  } catch (error) {
    console.error("Brand overview API error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch brand sessions" },
      { status: 500 }
    );
  }
}

//i am just updating this file to make sure i am being engaged in some sort of q
