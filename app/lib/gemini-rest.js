import { GoogleAuth } from "google-auth-library";

const auth =
  process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY
    ? new GoogleAuth({
        credentials: {
          client_email: process.env.GCP_CLIENT_EMAIL,
          private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, "\n"),
        },
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      })
    : null;

function buildGeminiRestError(code, message, details = {}) {
  const error = new Error(message);
  error.name = code;
  Object.assign(error, details);
  return error;
}

export async function generateGeminiContentRest({
  modelName,
  contents,
  generationConfig,
  safetySettings,
  systemInstruction,
  location = "global",
}) {
  if (!auth) {
    throw buildGeminiRestError(
      "auth_not_configured",
      "Google auth is not configured"
    );
  }

  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;

  if (!projectId) {
    throw buildGeminiRestError(
      "project_not_configured",
      "Google Cloud project is not configured"
    );
  }

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const requestBody = {
    contents,
    ...(generationConfig ? { generationConfig } : {}),
    ...(safetySettings ? { safetySettings } : {}),
    ...(systemInstruction ? { systemInstruction } : {}),
  };

  const response = await fetch(
    `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelName}:generateContent`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    let payload = null;
    let rawBody = "";

    try {
      payload = await response.json();
    } catch {
      try {
        rawBody = await response.text();
      } catch {
        rawBody = "";
      }
    }

    throw buildGeminiRestError(
      "vertex_generate_content_failed",
      payload?.error?.message ||
        rawBody ||
        "Gemini REST generateContent request failed",
      {
        status: response.status,
        statusText: response.statusText,
        vertexCode: payload?.error?.code,
        vertexStatus: payload?.error?.status,
        rawBody,
      }
    );
  }

  return response.json();
}

export function extractGeminiText(response) {
  const text = response?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || "")
    .join("")
    .trim();

  if (!text) {
    throw buildGeminiRestError(
      "invalid_gemini_response",
      "Gemini response did not contain text output"
    );
  }

  return text;
}
