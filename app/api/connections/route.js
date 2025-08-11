import { connectDB } from "@/app/lib/db";
import { NextResponse } from "next/server";
import User from "@/app/models/Users";
import Connection from "@/app/models/Connection";
import { EmailTemplate } from "@/app/components/EmailTemplate";
import { Resend } from "resend";
import Matches from "@/app/models/Matches";
import Session from "@/app/models/ChatSessions";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (
  toEmail,
  profileType,
  matchPercentage,
  jobTitle,
  senderName
) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "Team Kavisha <team@kavisha.ai>",
      to: toEmail,
      subject: "Team Kavisha.ai",
      react: EmailTemplate({
        profileType: profileType,
        senderName: senderName || "John Doe",
        jobTitle: jobTitle || "Software Developer",
        matchPercentage: matchPercentage || "80%",
        receiverEmail: toEmail,
      }),
    });
    if (data) {
      return true;
    }
    if (error) {
      return false;
    }
  } catch (error) {
    console.error("Email sending error:", error);
    return false;
  }
};

export async function POST(req) {
  try {
    const {
      receiverId,
      receiverSession,
      senderId,
      senderProfileType,
      senderSession,
    } = await req.json();
    if (
      !receiverId ||
      !receiverSession ||
      !senderId ||
      !senderProfileType ||
      !senderSession
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if sender exists and get their credits
    const currentUser = await User.findOne({ _id: senderId });
    if (!currentUser) {
      return NextResponse.json(
        { error: "Sender user not found" },
        { status: 404 }
      );
    }
    const senderChatSession = await Session.findOne({ _id: senderSession });

    let senderName = currentUser?.name;
    let matchPercentage = senderChatSession.matchPercentage;
    let jobTitle = senderChatSession.title;

    // Check credits for recruiters
    if (senderProfileType === "recruiter") {
      const remainingCredits = currentUser.remainingCredits || 0;
      if (remainingCredits < 1) {
        return NextResponse.json(
          {
            error: "Insufficient credits",
            message:
              "Free credits exhausted!! Add credits for adding new connections",
          },
          { status: 402 }
        );
      }
    }

    // Check for existing connection to prevent duplicates
    const existingConnection = await Connection.findOne({
      receiverSession: receiverSession,
      senderSession: senderSession,
    });

    if (existingConnection) {
      await Matches.findOneAndUpdate(
        { matchedSessionId: receiverSession },
        { contacted: true }
      );
      return NextResponse.json(
        { message: "Connection request already sent" },
        { status: 409 }
      );
    }

    // Create new connection
    const message =
      senderProfileType !== "recruiter"
        ? "We found potential candidates for you"
        : "We have found some amazing job opportunities for you";

    const newConnection = await Connection.create({
      senderSession: senderSession,
      receiverSession: receiverSession,
      senderId: senderId,
      receiverId: receiverId,
      message: message,
      emailSent: true,
    });

    // Deduct 1 credit if recruiter
    if (senderProfileType === "recruiter") {
      await User.updateOne(
        { _id: senderId },
        { $inc: { remainingCredits: -1 } }
      );
    }

    // Send email to receiver,assumin gif connection is created then email has to be sent
    const receiverUserObject = await User.findOne({ _id: receiverId });
    if (receiverUserObject) {
      await sendEmail(
        receiverUserObject.email,
        receiverUserObject.profileType, // ✅ Use receiver's profile type
        matchPercentage,
        jobTitle,
        senderName
      );
    }
    await Matches.findOneAndUpdate(
      { matchedSessionId: receiverSession },
      { contacted: true }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Connection request and email sent successfully!",
        connectionId: newConnection._id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Connection API error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Something went wrong" },
      { status: 500 }
    );
  }
}
