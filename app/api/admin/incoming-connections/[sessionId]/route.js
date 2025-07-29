import Connection from "@/app/models/Connection";
import Session from "@/app/models/ChatSessions";
import User from "@/app/models/Users";
import { connectDB } from "@/app/lib/db";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          message: "Session ID is required",
        },
        { status: 400 }
      );
    }

    // Get session details first
    const session =
      await Session.findById(sessionId).select("userId title role");
    const sessionOwner = await User.findById(session?.userId).select(
      "name email"
    );

    // Fetch all incoming connections for this session (where receiverSession = sessionId)
    const connections = await Connection.find({ receiverSession: sessionId })
      .select(
        "senderId receiverId senderSession receiverSession message emailSent createdAt"
      )
      .sort({ createdAt: -1 }); // Most recent first

    // Enhance connections with user details
    const enhancedConnections = await Promise.all(
      connections.map(async (connection) => {
        try {
          // Get sender details (who sent the connection request)
          const sender = await User.findById(connection.senderId).select(
            "name email"
          );
          const senderSession = await Session.findById(
            connection.senderSession
          ).select("title role");

          // Get receiver details (this session owner)
          const receiver = await User.findById(connection.receiverId).select(
            "name email"
          );
          const receiverSession = await Session.findById(
            connection.receiverSession
          ).select("title role");

          return {
            ...connection.toObject(),
            sender: {
              name: sender?.name || "Unknown",
              email: sender?.email || "N/A",
              sessionTitle: senderSession?.title || "Unknown Session",
              sessionRole: senderSession?.role || "Unknown",
            },
            receiver: {
              name: receiver?.name || "Unknown",
              email: receiver?.email || "N/A",
              sessionTitle: receiverSession?.title || "Unknown Session",
              sessionRole: receiverSession?.role || "Unknown",
            },
          };
        } catch (error) {
          console.error("Error enhancing connection:", error);
          return {
            ...connection.toObject(),
            sender: {
              name: "Unknown",
              email: "N/A",
              sessionTitle: "Unknown",
              sessionRole: "Unknown",
            },
            receiver: {
              name: "Unknown",
              email: "N/A",
              sessionTitle: "Unknown",
              sessionRole: "Unknown",
            },
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      totalIncomingConnections: enhancedConnections.length,
      connections: enhancedConnections,
    });
  } catch (error) {
    console.error("Error fetching incoming connections:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch incoming connections",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
