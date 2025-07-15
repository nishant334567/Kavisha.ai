import { connectDB } from "@/app/lib/db";
import Connection from "@/app/models/Connection";

export async function GET(req, { params }) {
  const { userId } = await params;
  try {
    await connectDB();
    const connections = await Connection.find({ receiverId: userId });
    const messages = connections.map((conn) => ({message:conn.message, createdAt:conn.createdAt, relatedSession: conn.receiverSession}));
    return Response.json({ messages });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
