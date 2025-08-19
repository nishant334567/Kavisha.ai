import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";

export async function GET() {
  await connectDB();
  const Session = (await import("@/app/models/ChatSessions")).default;
  const User = (await import("@/app/models/Users")).default;
  const Matches = (await import("@/app/models/Matches")).default;
  const ChatLogs = (await import("@/app/models/ChatLogs")).default;

  // Get all sessions, users, and logs
  const sessions = await Session.find({});
  const userIds = (await User.find({})).map((u) => u._id.toString());
  const sessionIds = sessions.map((s) => s._id.toString());

  // Find orphaned sessions (return only their _id as string)
  const orphanedSessions = sessions
    .filter((s) => !s.userId || !userIds.includes(s.userId.toString()))
    .map((s) => s._id.toString());

  // Find orphaned matches
  const matches = await Matches.find({});
  const sessionMap = new Map(sessions.map((s) => [s._id.toString(), s]));
  const userIdSet = new Set(userIds);
  const orphanedMatches = [];
  for (const m of matches) {
    const sessionId = m.sessionId?.toString();
    const matchedSessionId = m.matchedSessionId?.toString();
    const matchedUserId = m.matchedUserId?.toString();
    const session = sessionMap.get(sessionId);
    const matchedSession = sessionMap.get(matchedSessionId);
    const matchedUserExists = matchedUserId && userIdSet.has(matchedUserId);
    const sessionUserExists =
      session && session.userId && userIdSet.has(session.userId.toString());
    const matchedSessionUserExists =
      matchedSession &&
      matchedSession.userId &&
      userIdSet.has(matchedSession.userId.toString());
    if (
      !session ||
      !matchedSession ||
      !matchedUserExists ||
      !sessionUserExists ||
      !matchedSessionUserExists
    ) {
      orphanedMatches.push(m._id.toString());
    }
  }

  // Find orphaned logs
  const logs = await ChatLogs.find({});
  const orphanedLogs = logs
    .filter(
      (log) =>
        !log.userId ||
        !userIdSet.has(log.userId.toString()) ||
        !log.sessionId ||
        !sessionMap.has(log.sessionId.toString())
    )
    .map((log) => log._id.toString());
  // Delete all orphaned documents
  const sessionDeleteResult = await Session.deleteMany({
    _id: { $in: orphanedSessions },
  });
  const matchDeleteResult = await Matches.deleteMany({
    _id: { $in: orphanedMatches },
  });
  const logDeleteResult = await ChatLogs.deleteMany({
    _id: { $in: orphanedLogs },
  });
  return NextResponse.json({
    deletedSessions: sessionDeleteResult.deletedCount,
    deletedMatches: matchDeleteResult.deletedCount,
    deletedLogs: logDeleteResult.deletedCount,
  });
}

// export async function DELETE() {
//   await connectDB();
//   const Session = (await import("@/app/models/ChatSessions")).default;
//   const User = (await import("@/app/models/Users")).default;
//   const Matches = (await import("@/app/models/Matches")).default;
//   const ChatLogs = (await import("@/app/models/ChatLogs")).default;

//   // Get all sessions, users, and logs
//   const sessions = await Session.find({});
//   const userIds = (await User.find({})).map((u) => u._id.toString());
//   const sessionIds = sessions.map((s) => s._id.toString());

//   // Orphaned sessions
//   const orphanedSessions = sessions
//     .filter((s) => !s.userId || !userIds.includes(s.userId.toString()))
//     .map((s) => s._id.toString());

//   // Orphaned matches
//   const matches = await Matches.find({});
//   const sessionMap = new Map(sessions.map((s) => [s._id.toString(), s]));
//   const userIdSet = new Set(userIds);
//   const orphanedMatches = [];
//   for (const m of matches) {
//     const sessionId = m.sessionId?.toString();
//     const matchedSessionId = m.matchedSessionId?.toString();
//     const matchedUserId = m.matchedUserId?.toString();
//     const session = sessionMap.get(sessionId);
//     const matchedSession = sessionMap.get(matchedSessionId);
//     const matchedUserExists = matchedUserId && userIdSet.has(matchedUserId);
//     const sessionUserExists =
//       session && session.userId && userIdSet.has(session.userId.toString());
//     const matchedSessionUserExists =
//       matchedSession &&
//       matchedSession.userId &&
//       userIdSet.has(matchedSession.userId.toString());
//     if (
//       !session ||
//       !matchedSession ||
//       !matchedUserExists ||
//       !sessionUserExists ||
//       !matchedSessionUserExists
//     ) {
//       orphanedMatches.push(m._id.toString());
//     }
//   }

//   // Orphaned logs
//   const logs = await ChatLogs.find({});
//   const orphanedLogs = logs
//     .filter(
//       (log) =>
//         !log.userId ||
//         !userIdSet.has(log.userId.toString()) ||
//         !log.sessionId ||
//         !sessionMap.has(log.sessionId.toString())
//     )
//     .map((log) => log._id.toString());

//   // Delete all orphaned documents
//   const sessionDeleteResult = await Session.deleteMany({
//     _id: { $in: orphanedSessions },
//   });
//   const matchDeleteResult = await Matches.deleteMany({
//     _id: { $in: orphanedMatches },
//   });
//   const logDeleteResult = await ChatLogs.deleteMany({
//     _id: { $in: orphanedLogs },
//   });

//   return NextResponse.json({
//     deletedSessions: sessionDeleteResult.deletedCount,
//     deletedMatches: matchDeleteResult.deletedCount,
//     deletedLogs: logDeleteResult.deletedCount,
//   });
// }
