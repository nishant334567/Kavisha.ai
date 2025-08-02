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
  

  io.on("initialize_connection", (data) => {
    const { senderSessionId, receiverSessionId } = data;
    const connectionId = createConnectionId(senderSessionId, receiverSessionId);
    activeConnections.add(connectionId);
    console.log(`Connection added:${connectionId}`);
  });

  io.on("send_message", (data) => {
    const { senderSessionId, receiverSessionId, message } = data;
    const connectionId = createConnectionId(senderSessionId, receiverSessionId);

    if (activeConnections.has(connectionId)) {
      //send message logic
    } else {
      console.log("No connection found");
    }
  });
});
