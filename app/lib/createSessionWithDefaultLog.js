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
        ? "Hi I am Kavisha — a smart, emotionally intelligent AI recruiter. "
        : "Hi I am Kavisha — a helpful recruiter assisting a company or hiring manager.";

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
