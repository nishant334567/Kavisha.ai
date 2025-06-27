//

import { NextResponse } from "next/server";
import pkg from "pdf-parse";
const pdf = pkg.default || pkg;
import Session from "@/app/models/ChatSessions";
import { connectDB } from "@/app/lib/db";

export async function POST(req) {
  await connectDB();
  const formData = await req.formData();
  const file = formData.get("file");
  const sessionId = formData.get("sessionId");
  console.log(file);
  if (!file)
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const data = await pdf(buffer);

    const result = await Session.updateOne(
      { _id: sessionId },
      { $set: { resumeSummary: data.text, resumeFilename: file.name } }
    );
    console.log(result, "result");
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ text: data.text });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to parse PDF", details: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  await connectDB();
  const { sessionId } = await req.json();
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  try {
    const result = await Session.updateOne(
      { _id: sessionId },
      { $set: { resumeFilename: "", resumeSummary: "" } }
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete resume", details: err.message },
      { status: 500 }
    );
  }
}
