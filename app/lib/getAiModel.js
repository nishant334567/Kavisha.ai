import { VertexAI } from "@google-cloud/vertexai";

export function getGeminiModel(modelName = "gemini-2.5-pro") {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
    const clientEmail = process.env.GCP_CLIENT_EMAIL;
    const privateKey = process.env.GCP_PRIVATE_KEY
      ? process.env.GCP_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined;

    if (!projectId || !clientEmail || !privateKey) {
      return null;
    }

    const vertexAI = new VertexAI({
      project: projectId,
      location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
      googleAuthOptions: {
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
      },
    });

    return vertexAI.getGenerativeModel({ model: modelName });
  } catch (error) {
    return null;
  }
}

export default getGeminiModel;