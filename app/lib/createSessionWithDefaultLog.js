const { connectDB } = require("./db");
const Session = require("../models/ChatSessions");
const Logs = require("../models/ChatLogs");

async function createSessionWithDefaultLog(userId, role, brand) {
  try {
    await connectDB();
    const session = await Session.create({
      userId,
      role,
      brand,
    });

    let message;
    if (role === "job_seeker") {
      message = `Hey! So happy to have your interest in working with Team ${brand.charAt(0).toUpperCase() + brand.slice(1)}!
Tell me a bit about yourself and what you're looking for.`;
    } else if (role === "recruiter") {
      message = `Hey! I'm ${brand.charAt(0).toUpperCase() + brand.slice(1)}'s recruitment bot. I'm here to help you hire great people, fast. Tell me about the role and what you need.`;
    } else if (role === "dating") {
      message = `Hey! I'm Kavisha's match making bot. I'm here to help you find a great match. Share a quick intro and what you're looking for.`;
    } else if (role === "individual") {
      message = `Hey! I'm ${brand.charAt(0).toUpperCase() + brand.slice(1)}.`;
    } else {
      message = `Hey! I'm Kavisha. Tell me a bit about yourself and how I can help.`;
    }

    await Logs.create({
      sessionId: session._id,
      userId,
      role: "assistant",
      message,
    });

    return session;
  } catch (err) {
    console.error("Failed to create Chat Session", err);
  }
}

module.exports = { createSessionWithDefaultLog };
