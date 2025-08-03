import { createServer } from "http";
import { Server } from "socket.io";
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

  function createConnectionId(sessionA, sessionB) {
    return [sessionA, sessionB].sort().join("_");
  }

  const activeUsers = new Map();
  const activeConnections = new Set();

  io.on("authenticate", (userData) => {});

  io.on("disconnect", () => {});

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });

    socket.on("send_message", (data) => {
      const { text, connectionId, timestamp, senderId } = data;

      if (activeConnections.has(connectionId)) {
        socket.to(connectionId).emit("message_received", {
          text: text,
          senderId: senderId,
          timestamp: timestamp,
        });
        console.log(`✅ Message "${text}" sent to room ${connectionId}`);
      } else {
        console.log("❌ Room not found:", connectionId);
      }
    });

    socket.on("join_room", (data) => {
      socket.join(data.connectionId);
      if (!activeConnections.has(connectionId)) {
        activeConnections.add(data.connectionId);
      }
      console.log(`✅ User joined room: ${data.connectionId}`);
    });
  });

  httpServer.listen(3000, () => {
    console.log(`nextjs+websocket service is running on port 3000`);
  });
});
