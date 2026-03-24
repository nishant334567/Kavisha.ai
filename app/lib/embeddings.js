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

function buildEmbeddingError(code, message, details = {}) {
  return {
    code,
    message,
    ...details,
  };
}

const EMBEDDING_BATCH_SIZE = 1;
const EMBEDDING_BATCH_DELAY_MS = 5000;
const EMBEDDING_RETRY_ROUND_DELAY_MS = 8000;
const EMBEDDING_MAX_RETRY_ROUNDS = 2;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateEmbedding(text, type) {
  try {
    if (!auth) {
      return 0;
    }
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const embeddingResponse = await fetch(
      `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/us-central1/publishers/google/models/text-embedding-005:predict`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [{ content: text, task_type: type }],
          parameters: {},
        }),
      }
    );

    if (!embeddingResponse.ok) {
      return 0;
    }

    const embeddingData = await embeddingResponse.json();

    const embedding = embeddingData.predictions[0].embeddings.values;
    return embedding;
  } catch (error) {
    return 0;
  }
}

export async function generateEmbeddingWithDebug(text, type) {
  try {
    if (!auth) {
      return {
        embedding: null,
        error: buildEmbeddingError("auth_not_configured", "Google auth is not configured"),
      };
    }

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const embeddingResponse = await fetch(
      `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/us-central1/publishers/google/models/text-embedding-005:predict`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [{ content: text, task_type: type }],
          parameters: {},
        }),
      }
    );

    if (!embeddingResponse.ok) {
      let payload = null;
      try {
        payload = await embeddingResponse.json();
      } catch {
        payload = null;
      }

      return {
        embedding: null,
        error: buildEmbeddingError(
          "vertex_request_failed",
          payload?.error?.message || "Embedding request failed",
          {
            status: embeddingResponse.status,
            statusText: embeddingResponse.statusText,
            vertexCode: payload?.error?.code,
            vertexStatus: payload?.error?.status,
          }
        ),
      };
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData?.predictions?.[0]?.embeddings?.values;

    if (!Array.isArray(embedding) || embedding.length === 0) {
      return {
        embedding: null,
        error: buildEmbeddingError(
          "invalid_embedding_payload",
          "Embedding response did not contain valid values"
        ),
      };
    }

    return { embedding, error: null };
  } catch (error) {
    return {
      embedding: null,
      error: buildEmbeddingError(
        error?.name || "embedding_error",
        error?.message || "Embedding generation failed"
      ),
    };
  }
}

export async function generateEmbeddingsInBatches(chunks, type) {
  const embeddingResults = new Array(chunks.length);
  let pendingChunks = chunks.map((chunkData, index) => ({
    ...chunkData,
    originalIndex: index,
  }));
  let retryRound = 0;

  while (pendingChunks.length > 0) {
    const failedChunks = [];

    for (let i = 0; i < pendingChunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = pendingChunks.slice(i, i + EMBEDDING_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(({ chunk }) => generateEmbeddingWithDebug(chunk, type))
      );

      for (let j = 0; j < batch.length; j++) {
        const chunkData = batch[j];
        const result = batchResults[j];

        if (Array.isArray(result?.embedding) && result.embedding.length > 0) {
          embeddingResults[chunkData.originalIndex] = result;
        } else {
          embeddingResults[chunkData.originalIndex] = result;
          failedChunks.push(chunkData);
        }
      }

      if (i + EMBEDDING_BATCH_SIZE < pendingChunks.length) {
        await delay(EMBEDDING_BATCH_DELAY_MS);
      }
    }

    if (failedChunks.length === 0) {
      break;
    }

    if (retryRound >= EMBEDDING_MAX_RETRY_ROUNDS) {
      break;
    }

    pendingChunks = failedChunks;
    retryRound += 1;
    await delay(EMBEDDING_RETRY_ROUND_DELAY_MS);
  }

  return embeddingResults;
}
