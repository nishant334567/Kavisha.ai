require("dotenv").config({ path: ".env.local" });
const { createServer } = require("http");
const { Server } = require("socket.io");
const { connectDB } = require("./lib/db.js");
const Messages = require("./models/Messages.js");
const next = require("next");
const express = require("express");

// Memory optimization for production
if (process.env.NODE_ENV === "production") {
  // Increase heap size limit
  const v8 = require("v8");
  v8.setFlagsFromString("--max-old-space-size=1536");

  // Force garbage collection periodically
  setInterval(() => {
    if (global.gc) {
      global.gc();
    }
  }, 30000); // Every 30 seconds
}

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const expressApp = express();
  const server = createServer(expressApp);
  const io = new Server(server, {
    cors: {
      origin:
        process.env.CLIENT_URL ||
        (process.env.NODE_ENV === "production" ? "*" : "http://localhost:3000"),
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const activeConnections = new Set();

  io.on("connection", (socket) => {
    socket.on("disconnect", () => {
      // Clean up connections to prevent memory leaks
      activeConnections.delete(socket.id);
    });

    socket.on("send_message", async (data) => {
      try {
        const { text, connectionId, senderUserId } = data;
        await connectDB();

        const msg = await Messages.create({
          conversationId: connectionId,
          senderId: senderUserId,
          content: text,
        });
        if (activeConnections.has(connectionId)) {
          socket.to(connectionId).emit("message_received", {
            text: text,
            senderUserId: senderUserId,
            // timestamp: msg.createdAt,
            connectionId: connectionId,
          });
        }
      } catch (error) {
        console.error("Error in send_message:", error);
      }
    });

    socket.on("join_room", async (data) => {
      try {
        const { connectionId } = data || {};
        if (!connectionId) return;
        socket.join(connectionId);
        if (!activeConnections.has(connectionId)) {
          activeConnections.add(connectionId);
        }

        // Send full message history for this connection
        try {
          await connectDB();
          const history = await Messages.find({
            conversationId: connectionId,
          })
            .sort({ createdAt: 1 })
            .lean()
            .limit(100);
          //
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

  // Handle all non-Socket.IO routes with Next.js
  expressApp.use((req, res) => {
    return handler(req, res);
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {});
});
