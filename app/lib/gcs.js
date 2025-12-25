import { Storage } from "@google-cloud/storage";

const storage = new Storage(
  process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY
    ? {
        credentials: {
          client_email: process.env.GCP_CLIENT_EMAIL,
          private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, "\n"),
        },
      }
    : {}
);

const bucketName =
  process.env.GCS_KNOWLEDGE_BASE || process.env.GCS_BUCKET_NAME;

// Only create bucket if bucketName is defined (prevents build-time errors)
export const bucket = bucketName ? storage.bucket(bucketName) : null;
