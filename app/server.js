require("dotenv/config");
const { createServer } = require("http");
const { Server } = require("socket.io");
const next = require("next");
const express = require("express");

// Dynamic imports for ES module files
let connectDB, ChatMessages;

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handler = app.getRequestHandler();

app.prepare().then(async () => {
  // Dynamic imports for ES module files
  try {
    const dbModule = await import("./lib/db.js");
    const chatMessagesModule = await import("./models/ChatMessages.js");
    connectDB = dbModule.connectDB;
    ChatMessages = chatMessagesModule.default;
  } catch (error) {
    console.error("Failed to import modules:", error);
    process.exit(1);
  }

  const expressApp = express();
  const server = createServer(expressApp);
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  const activeConnections = new Set();

  io.on("connection", (socket) => {
    socket.on("disconnect", () => {});

    socket.on("send_message", async (data) => {
      const {
        text,
        connectionId,
        timestamp,
        senderSessionId,
        receiverSessionId,
      } = data;
      await connectDB();

      const msg = await ChatMessages.create({
        connectionId,
        senderSessionId,
        receiverSessionId,
        text,
        deliveredAt: activeConnections.has(connectionId) ? new Date() : null,
        createdAt: timestamp,
      });
      if (activeConnections.has(connectionId)) {
        socket.to(connectionId).emit("message_received", {
          text: text,
          senderSessionId: senderSessionId,
          receiverSessionId: receiverSessionId,
          timestamp: msg.createdAt,
          connectionId: connectionId,
        });
      } else {
      }
    });

    socket.on("join_room", async (data) => {
      const { connectionId } = data || {};
      if (!connectionId) return;
      socket.join(connectionId);
      if (!activeConnections.has(connectionId)) {
        activeConnections.add(connectionId);
      }

      // Send full message history for this connection
      try {
        await connectDB();
        const history = await ChatMessages.find({ connectionId })
          .sort({ createdAt: 1 })
          .lean();

        socket.emit(
          "message_history",
          history.map((m) => ({
            id: m._id.toString(),
            text: m.text,
            senderSessionId:
              m.senderSessionId?.toString?.() ?? m.senderSessionId,
            receiverSessionId:
              m.receiverSessionId?.toString?.() ?? m.receiverSessionId,
            timestamp: m.createdAt,
          }))
        );
      } catch (e) {
        console.error("Failed to load message history:", e);
      }
    });
  });

  expressApp.use((req, res) => handler(req, res));
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
