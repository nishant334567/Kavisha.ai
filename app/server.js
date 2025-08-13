import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDB } from "./lib/db.js";
import ChatMessages from "./models/ChatMessages.js";
import next from "next";

const app = next({ dev: true, hostname: "localhost", port: 3000 });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  const activeConnections = new Set();

  io.on("authenticate", (userData) => {});

  io.on("disconnect", () => {});

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

  httpServer.listen(3000, () => {});
});
