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

/** Website bulk import — faster than default, with gentler pacing to avoid rate limits. */
export const BULK_EMBEDDING_OPTIONS = {
  batchSize: Math.max(
    1,
    Number(process.env.WEBSITE_EMBEDDING_BATCH_SIZE) || 3
  ),
  batchDelayMs: Math.max(
    0,
    Number(process.env.WEBSITE_EMBEDDING_BATCH_DELAY_MS) || 2000
  ),
  retryRoundDelayMs: Math.max(
    0,
    Number(process.env.WEBSITE_EMBEDDING_RETRY_DELAY_MS) || 6000
  ),
  maxRetryRounds: Math.max(
    1,
    Number(process.env.WEBSITE_EMBEDDING_MAX_RETRIES) || 4
  ),
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function isEmbeddingConfigured() {
  return Boolean(auth && String(process.env.GOOGLE_CLOUD_PROJECT || "").trim());
}

/** User-safe message when retrieval embedding fails (API surfaces this in chat). */
export function getEmbeddingFailureUserMessage(error) {
  if (error?.code === "auth_not_configured") {
    return "The assistant search service is not configured. Please contact support.";
  }
  return "Something went wrong while searching the knowledge base. Please try again.";
}

/**
 * Retrieval embedding with retry + structured error (lead journey, enrich profile, etc.).
 */
export async function generateRetrievalEmbedding(
  text,
  type = "RETRIEVAL_QUERY",
  { attempts = 2, retryDelayMs = 800 } = {},
) {
  if (!isEmbeddingConfigured()) {
    const error = buildEmbeddingError(
      "auth_not_configured",
      "Set GCP_CLIENT_EMAIL, GCP_PRIVATE_KEY, and GOOGLE_CLOUD_PROJECT in .env.local",
    );
    console.error("[embeddings]", error.message);
    return { embedding: null, error };
  }

  let lastError = null;
  for (let i = 0; i < attempts; i++) {
    const result = await generateEmbeddingWithDebug(text, type);
    if (Array.isArray(result.embedding) && result.embedding.length > 0) {
      return { embedding: result.embedding, error: null };
    }
    lastError = result.error;
    if (i < attempts - 1 && retryDelayMs > 0) {
      await delay(retryDelayMs);
    }
  }

  console.error("[embeddings] retrieval embedding failed:", lastError, {
    type,
    preview: String(text || "").slice(0, 120),
  });
  return { embedding: null, error: lastError };
}

export async function generateEmbedding(text, type) {
  const { embedding } = await generateRetrievalEmbedding(text, type, {
    attempts: 1,
    retryDelayMs: 0,
  });
  return embedding ?? 0;
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

export async function generateEmbeddingsInBatches(chunks, type, options = {}) {
  const batchSize = options.batchSize ?? EMBEDDING_BATCH_SIZE;
  const batchDelayMs = options.batchDelayMs ?? EMBEDDING_BATCH_DELAY_MS;
  const retryRoundDelayMs =
    options.retryRoundDelayMs ?? EMBEDDING_RETRY_ROUND_DELAY_MS;
  const maxRetryRounds = options.maxRetryRounds ?? EMBEDDING_MAX_RETRY_ROUNDS;

  const embeddingResults = new Array(chunks.length);
  let pendingChunks = chunks.map((chunkData, index) => ({
    ...chunkData,
    originalIndex: index,
  }));
  let retryRound = 0;

  while (pendingChunks.length > 0) {
    const failedChunks = [];

    for (let i = 0; i < pendingChunks.length; i += batchSize) {
      const batch = pendingChunks.slice(i, i + batchSize);
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

      if (i + batchSize < pendingChunks.length && batchDelayMs > 0) {
        await delay(batchDelayMs);
      }
    }

    if (failedChunks.length === 0) {
      break;
    }

    if (retryRound >= maxRetryRounds) {
      break;
    }

    pendingChunks = failedChunks;
    retryRound += 1;
    if (retryRoundDelayMs > 0) {
      await delay(retryRoundDelayMs);
    }
  }

  return embeddingResults;
}
