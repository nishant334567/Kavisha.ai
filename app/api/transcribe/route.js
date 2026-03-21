import { GoogleAuth } from "google-auth-library";

export const runtime = "nodejs";
export const maxDuration = 60; // seconds

const SPEECH_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

function getGoogleAccessToken() {
  const clientEmail = process.env.GCP_CLIENT_EMAIL;
  const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    return null;
  }

  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: [SPEECH_SCOPE],
  });

  return auth.getClient();
}

export async function POST(req) {
  try {
    const authClient = await getGoogleAccessToken();

    if (!authClient) {
      return Response.json(
        {
          success: false,
          message: "Missing GCP_CLIENT_EMAIL or GCP_PRIVATE_KEY",
        },
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

    const accessTokenResponse = await authClient.getAccessToken();
    const accessToken =
      typeof accessTokenResponse === "string"
        ? accessTokenResponse
        : accessTokenResponse?.token;

    if (!accessToken) {
      return Response.json(
        { success: false, message: "Failed to get Google access token" },
        { status: 500 }
      );
    }

    const audioBuffer = Buffer.from(await file.arrayBuffer());
    const content = audioBuffer.toString("base64");

    const response = await fetch(
      "https://speech.googleapis.com/v1/speech:recognize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: {
            encoding: "WEBM_OPUS",
            languageCode: "en-US",
            enableAutomaticPunctuation: true,
            model: "default",
          },
          audio: { content },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      const message =
        result?.error?.message || "Google Speech-to-Text request failed";
      return Response.json({ success: false, message }, { status: 500 });
    }

    const text = (result?.results || [])
      .flatMap((item) => item?.alternatives || [])
      .map((item) => item?.transcript || "")
      .join(" ")
      .trim();

    return Response.json({
      success: true,
      text,
    });
  } catch (err) {
    const message =
      err?.response?.data?.error?.message || err?.message || "Transcription failed";
    return Response.json({ success: false, message }, { status: 500 });
  }
}
