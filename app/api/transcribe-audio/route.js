import { NextResponse } from "next/server";
import speech from "@google-cloud/speech";
import path from "path";
const client = new speech.SpeechClient({
  keyFilename: path.join(process.cwd(), "service-account-key.json"),
});

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const uri = searchParams.get("vid");
  const languageCode = searchParams.get("languageCode") || "en-US";
  console.log(uri, languageCode);
  if (!uri) {
    return NextResponse.json({ error: "Missing URI" }, { status: 400 });
  }

  try {
    const [operation] = await client.longRunningRecognize({
      audio: { uri },
      config: {
        encoding: "MP3",
        languageCode: "en-US", // Default to English, but you can change this
        alternativeLanguageCodes: ["hi-IN", "en-IN", "es-ES", "fr-FR"], // Support multiple languages
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
      },
    });
    return NextResponse.json(
      {
        success: true,
        jobId: operation.name,
        message: "Transcription Started",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Transcription error:", err);
    return NextResponse.json(
      {
        message: "Failed starting transcription",
        error: err.message,
        details: err.toString(),
      },
      { status: 500 }
    );
  }
}
