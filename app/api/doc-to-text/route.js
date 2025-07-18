import { connectDB } from "@/app/lib/db";
import { NextResponse } from "next/server";
import officeParser from "officeparser";
import Session from "@/app/models/ChatSessions";

export async function POST(req) {
  await connectDB();
  const formData = await req.formData();
  const file = formData.get("file");
  const sessionId = formData.get("sessionId");
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // Read file as buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    // officeParser.parseOfficeAsync can take a buffer directly
    const text = await officeParser.parseOfficeAsync(buffer, {
      newlineDelimiter: " ",
      outputErrorToConsole: true,
    });

    const result = await Session.updateOne(
      { _id: sessionId },
      {
        $set: { resumeSummary: text, resumeFilename: file.name },
      }
    );

    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to parse document", details: err.message },
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
