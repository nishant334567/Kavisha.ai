const { connectDB } = require("./db");
const Session = require("../models/ChatSessions");
const Logs = require("../models/ChatLogs");

async function createSessionWithDefaultLog(
  userId,
  role,
  brand,
  initialmessage = null,
  isCommunityChat,
  chatName
) {
  try {
    await connectDB();
    const session = await Session.create({
      userId,
      role,
      brand,
      isCommunityChat: Boolean(isCommunityChat),
      name: chatName, // Ensure it's always a boolean
    });

    await Logs.create({
      sessionId: session._id,
      userId,
      role: "assistant",
      message: initialmessage || "Hi there! How can I help You?",
    });

    return session;
  } catch (err) {}
}

module.exports = { createSessionWithDefaultLog };
