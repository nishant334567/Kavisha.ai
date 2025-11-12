import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60; // seconds

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { success: false, message: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!file) {
      return Response.json(
        {
          success: false,
          message:
            "No file uploaded. Expect 'file' field in multipart/form-data.",
        },
        { status: 400 }
      );
    }

    // Optional parameters
    const language = form.get("language") || undefined;
    const prompt = form.get("prompt") || undefined;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // The File object from formData works directly with the OpenAI SDK in Node route handlers
    const result = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language,
      prompt,
      // response_format: "json" // default
    });

    return Response.json({ success: true, text: result.text || "" });
  } catch (err) {
    const message =
      err?.response?.data?.error?.message ||
      err?.message ||
      "Transcription failed";
    return Response.json({ success: false, message }, { status: 500 });
  }
}
