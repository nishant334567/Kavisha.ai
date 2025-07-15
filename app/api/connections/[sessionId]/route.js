import { connectDB } from "@/app/lib/db";
import Connection from "@/app/models/Connection";

export async function GET(req, { params }) {
  const { sessionId } = await params;
  try {
    await connectDB();
    const connections = await Connection.find({ receiverSession: sessionId });
    return Response.json({ connections });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
