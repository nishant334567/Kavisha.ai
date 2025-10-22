import { NextResponse } from "next/server";
import speech from "@google-cloud/speech";
import path from "path";

const client = new speech.SpeechClient({
  keyFilename: path.join(process.cwd(), "service-account-key.json"),
});

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const jobid = searchParams.get("jobid");

  if (!jobid) {
    return NextResponse.json({ error: "Missing jobid" }, { status: 400 });
  }

  try {
    // ✅ FIXED LINE — no destructuring
    const operation = await client.checkLongRunningRecognizeProgress(jobid);

    if (!operation.done) {
      return NextResponse.json({ status: "processing" });
    }

    if (operation.error) {
      return NextResponse.json(
        {
          status: "error",
          error: operation.error.message,
        },
        { status: 500 }
      );
    }
    console.log("Operation result:", operation.result);

    // The results are in operation.result.results
    if (
      operation.result &&
      operation.result.results &&
      operation.result.results.length > 0
    ) {
      console.log("Found results:", operation.result.results.length);

      // Debug each result
      operation.result.results.forEach((result, index) => {
        console.log(`Result ${index}:`, {
          transcript: result.alternatives[0].transcript,
          confidence: result.alternatives[0].confidence,
          endTime: result.resultEndTime,
        });
      });

      const transcription = operation.result.results
        .map((r) => r.alternatives[0].transcript)
        .join("\n");

      console.log("Full transcription:", transcription);

      return NextResponse.json({
        status: "done",
        transcription: transcription,
      });
    }

    console.log("No results found");
    return NextResponse.json({
      status: "done",
      transcription: "",
    });
  } catch (error) {
    console.error("Transcription check error:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
