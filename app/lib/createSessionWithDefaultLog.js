import { connectDB } from "./db";
import Session from "../models/ChatSessions";
import Logs from "../models/ChatLogs";

export async function createSessionWithDefaultLog(userId, role) {
  let newSessionId;
  try {
    await connectDB();
    const session = await Session.create({
      userId,
      role,
    });

    const message =
      role === "job_seeker"
        ? `Hey! I'm Kavisha. I'm here to help you find a great job, or provide you some guidance if you're feeling a bit lost, career wise. Tell me a bit about yourself and how I can help?`
        : `Hey! I'm Kavisha. I'm here to help you nice people, and quickly! Tell me a bit about what you're looking for and how I can help?`;

    await Logs.create({
      sessionId: session._id,
      userId,
      role: "assistant",
      message,
    });
    newSessionId = session._id;
    return newSessionId;
  } catch (err) {
    console.error("Failed to create Chat Session", err);
  }
}
