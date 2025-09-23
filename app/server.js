// Load local env vars only during development to avoid leaking dev URLs in prod
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: ".env.local" });
}
const { createServer } = require("http");
const { Server } = require("socket.io");
const { connectDB } = require("./lib/db.js");
const Messages = require("./models/Messages.js");
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
const app = next({ dev });
const handler = app.getRequestHandler();

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
        const { text, connectionId, senderUserId } = data;

        if (!text || !connectionId || !senderUserId) {
          return;
        }

        await connectDB();

        const msg = await Messages.create({
          conversationId: connectionId,
          senderId: senderUserId,
          content: text,
        });

        // Broadcast to all sockets in the connection room
        io.to(connectionId).emit("message_received", {
          text: text,
          senderUserId: senderUserId,
          connectionId: connectionId,
        });
      } catch (error) {
        console.error("Error in send_message:", error);
      }
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
            }))
          );
        } catch (e) {
          console.error("Failed to load message history:", e);
        }
      } catch (error) {
        console.error("Error in join_room:", error);
      }
    });
  });

  expressApp.use((req, res, next) => {
    if (req.path.startsWith("/socket.io/")) {
      return next();
    }
    return handler(req, res);
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {});
});
