// Load local env vars only during development to avoid leaking dev URLs in prod
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: ".env.local" });
}
const { createServer } = require("http");
const { Server } = require("socket.io");
const { connectDB } = require("./lib/db.js");
const Messages = require("./models/Messages.js");
const Conversations = require("./models/Conversations.js");
const next = require("next");
const express = require("express");

// Memory optimization for production
if (process.env.NODE_ENV === "production") {
  const v8 = require("v8");
  v8.setFlagsFromString("--max-old-space-size=1536");

  setInterval(() => {
    if (global.gc) {
      global.gc();
    }
  }, 30000);
}

const dev = process.env.NODE_ENV !== "production";
const PORT = Number(process.env.PORT) || 3000;

const app = next({ dev });
const handler = app.getRequestHandler();

if (dev) {
  console.log("Preparing Next.js (first start can take 30–60s)...");
}

app.prepare().then(() => {
  const expressApp = express();
  const server = createServer(expressApp);

  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "https://kavisha.ai",
        "https://www.kavisha.ai",
        /^https:\/\/.*\.kavisha\.ai$/,
      ],
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["*"],
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
    path: "/socket.io/",
  });

  const activeConnections = new Set();
  const userSockets = new Map(); // Map userId to socket.id

  io.on("connection", (socket) => {
    socket.on("register_user", (userId) => {
      socket.userId = userId;
      activeConnections.add(socket.id);
      userSockets.set(userId, socket.id);
    });

    socket.on("disconnect", () => {
      activeConnections.delete(socket.id);
      if (socket.userId) {
        userSockets.delete(socket.userId);
      }
    });

    socket.on("send_message", async (data) => {
      try {
        const { text, connectionId, senderUserId, senderRole, senderName } = data;

        if (!text || !connectionId || !senderUserId) {
          return;
        }

        await connectDB();

        const conv = await Conversations.findOne({ connectionId })
          .select("blockedUserId")
          .lean();
        const blocked = conv?.blockedUserId
          ? String(conv.blockedUserId)
          : null;
        if (blocked && String(senderUserId) === blocked) {
          socket.emit("send_rejected", {
            connectionId,
            reason: "messaging_closed",
          });
          return;
        }

        const msg = await Messages.create({
          conversationId: connectionId,
          senderId: senderUserId,
          senderRole: typeof senderRole === "string" ? senderRole : null,
          senderName: typeof senderName === "string" ? senderName : null,
          content: text,
        });

        // Broadcast to all sockets in the connection room
        io.to(connectionId).emit("message_received", {
          text: text,
          senderUserId: senderUserId,
          senderRole: msg.senderRole || undefined,
          senderName: msg.senderName || undefined,
          connectionId: connectionId,
          createdAt: msg.createdAt
            ? typeof msg.createdAt === "string"
              ? msg.createdAt
              : new Date(msg.createdAt).toISOString()
            : new Date().toISOString(),
        });
      } catch (error) {}
    });

    socket.on("join_room", async (data) => {
      try {
        const { connectionId } = data || {};
        if (!connectionId) return;

        socket.join(connectionId);

        try {
          await connectDB();
          const history = await Messages.find({
            conversationId: connectionId,
          })
            .sort({ createdAt: 1 })
            .lean()
            .limit(100);

          socket.emit(
            "message_history",
            history.map((m) => ({
              id: m.senderId,
              text: m.content,
              senderUserId: m.senderId,
              senderRole: m.senderRole || undefined,
              senderName: m.senderName || undefined,
              createdAt: m.createdAt
                ? typeof m.createdAt === "string"
                  ? m.createdAt
                  : new Date(m.createdAt).toISOString()
                : new Date().toISOString(),
            }))
          );
        } catch (e) {}
      } catch (error) {}
    });
  });

  expressApp.use((req, res, next) => {
    if (req.path.startsWith("/socket.io/")) {
      return next();
    }
    try {
      const result = handler(req, res);
      if (result && typeof result.catch === "function") {
        result.catch((err) => {
          console.error("[next handler]", req.method, req.url, err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end("Internal Server Error");
          }
        });
      }
    } catch (err) {
      console.error("[next handler]", req.method, req.url, err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    }
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the other process or run: npm run dev:clean`
      );
    } else {
      console.error("Server failed to start:", err.message);
    }
    process.exit(1);
  });

  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to prepare Next.js:", err);
  process.exit(1);
});
