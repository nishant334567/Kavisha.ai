import Session from "@/app/models/ChatSessions";
import { connectDB } from "@/app/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { default: pdf } = await import("pdf-parse/lib/pdf-parse.js");

    const formData = await request.formData();
    const file = formData.get("pdf");
    const sessionId = formData.get("sessionId");

    if (!file) {
      return new Response(JSON.stringify({ error: "No PDF file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if file is PDF
    if (file.type !== "application/pdf") {
      return new Response(JSON.stringify({ error: "File must be a PDF" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from PDF with options
    const data = await pdf(buffer, {
      // Options to prevent file system access
      max: 0, // 0 means no page limit
      version: "v1.10.100", // Specify version to avoid auto-detection
    });
    console.log("data pdf", data.text);
    const result = await Session.updateOne(
      { _id: sessionId },
      {
        $set: { resumeSummary: data.text, resumeFilename: file.name },
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        text: data.text,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("PDF extraction error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to extract text from PDF",
        details: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
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
