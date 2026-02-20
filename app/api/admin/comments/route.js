import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import AdminComment from "@/app/models/AdminComment";
import Session from "@/app/models/ChatSessions";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";

export async function GET(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const sessionId = req.nextUrl.searchParams.get("sessionId");
        if (!sessionId) {
          return NextResponse.json(
            { success: false, message: "Missing sessionId" },
            { status: 400 }
          );
        }
        await connectDB();
        const session = await Session.findById(sessionId).lean();
        if (!session) {
          return NextResponse.json(
            { success: false, message: "Session not found" },
            { status: 404 }
          );
        }
        const isAdmin = await isBrandAdmin(decodedToken.email, session.brand);
        if (!isAdmin) {
          return NextResponse.json(
            { success: false, message: "Forbidden" },
            { status: 403 }
          );
        }
        const comments = await AdminComment.find({ sessionId })
          .sort({ createdAt: 1 })
          .lean();
        return NextResponse.json({
          success: true,
          comments: comments.map((c) => ({
            _id: c._id,
            comment: c.comment,
            authorName: c.authorName || "",
            createdAt: c.createdAt,
          })),
        });
      } catch (err) {
        return NextResponse.json(
          { success: false, message: "Failed to fetch comments" },
          { status: 500 }
        );
      }
    },
  });
}

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { sessionId, comment } = await req.json();
        if (!sessionId || comment == null || String(comment).trim() === "") {
          return NextResponse.json(
            { success: false, message: "sessionId and comment required" },
            { status: 400 }
          );
        }
        await connectDB();
        const session = await Session.findById(sessionId).lean();
        if (!session) {
          return NextResponse.json(
            { success: false, message: "Session not found" },
            { status: 404 }
          );
        }
        const isAdmin = await isBrandAdmin(decodedToken.email, session.brand);
        if (!isAdmin) {
          return NextResponse.json(
            { success: false, message: "Forbidden" },
            { status: 403 }
          );
        }
        console.log("Decoden token:", decodedToken)
        const authorName =
          decodedToken.name ||
          (decodedToken.email && decodedToken.email.split("@")[0]) ||
          "Admin";
        const doc = await AdminComment.create({
          sessionId,
          comment: String(comment).trim(),
          authorName: String(authorName).trim(),
        });
        return NextResponse.json({
          success: true,
          comment: {
            _id: doc._id,
            comment: doc.comment,
            authorName: doc.authorName || "",
            createdAt: doc.createdAt,
          },
        });
      } catch (err) {
        return NextResponse.json(
          { success: false, message: "Failed to add comment" },
          { status: 500 }
        );
      }
    },
  });
}
