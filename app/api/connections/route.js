import { connectDB } from "@/app/lib/db";
import { NextResponse } from "next/server";
import officeParser from "officeparser";
import Session from "@/app/models/ChatSessions";
import User from "@/app/models/Users";
import Connection from "@/app/models/Connection";
import { EmailTemplate } from "@/app/components/EmailTemplate";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (toEmail, profileType) => {
  const { data, error } = await resend.emails.send({
    from: "team@kavisha.ai",
    to: toEmail,
    subject: "Team Kavisha.ai",
    react: EmailTemplate({
      profileType: profileType,
    }),
  });
  if (data) {
    console.log("Email sent successfully");
  }
  if (error) {
    console.log("Email sending failed", err);
  }
};
export async function POST(req) {
  const {
    receiverId,
    receiverSession,
    senderId,
    senderProfileType,
    senderSession,
  } = await req.json();
  console.log(
    receiverId,
    receiverSession,
    senderId,
    senderProfileType,
    senderSession,
    "Debug"
  );
  try {
    await connectDB();
    const currentUser = await User.findOne({ _id: senderId });
    if (currentUser) {
      let remainingCredits;
      remainingCredits = currentUser.credits;
      if (remainingCredits < 1 && senderProfileType === "recruiter") {
        return NextResponse.json(
          {
            message:
              "Free credits exhausted!! Add credits for adding new connections",
          },
          { status: 200 }
        );
      }
    }
    // prevent duplicate notify and email sent
    const connection = await Connection.find({
      receiverSession: receiverSession,
      senderSession: senderSession,
    });
    if (connection.length === 0) {
      let message =
        senderProfileType !== "recruiter"
          ? "We found potential candidates for you"
          : "We have found some amazing job oppurtunities for you";
      await Connection.create({
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
      //fetch email of receiver from receiverId
      const receiverUserObject = await User.findOne({ _id: receiverId });
      if (receiverUserObject) {
        sendEmail(receiverUserObject.email, senderProfileType);
      }
      return NextResponse.json({
        message: "Connection request and email sent!!"
      });
    } else {
      return NextResponse.json({ message: "Connection request sent already" });
    }
    //check if email already sent
  } catch (err) {
    return NextResponse.json({ message: "Something didnt worked", err });
  }
}
