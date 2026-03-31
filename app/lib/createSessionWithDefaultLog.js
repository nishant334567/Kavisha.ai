const { connectDB } = require("./db");
const Session = require("../models/ChatSessions");
const Logs = require("../models/ChatLogs");

async function createSessionWithDefaultLog(
  userId,
  role,
  brand,
  initialmessage = null,
  isCommunityChat,
  chatName,
  serviceKey
) {
  if (!serviceKey || typeof serviceKey !== "string" || !serviceKey.trim()) {
    throw new Error("serviceKey is required and must be a non-empty string");
  }
  try {
    await connectDB();
    const session = await Session.create({
      userId,
      role,
      brand,
      isCommunityChat: Boolean(isCommunityChat),
      name: chatName,
      serviceKey: serviceKey.trim(),
    });

    await Logs.create({
      sessionId: session._id,
      userId,
      role: "assistant",
      message: initialmessage || "Hi there! How can I help You?",
    });

    return session;
  } catch (err) {
    throw err;
  }
}

module.exports = { createSessionWithDefaultLog };
