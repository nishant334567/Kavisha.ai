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


export async function refreshImageUrl(url) {
  if (!bucket || !url) return url;

  try {
    let path;

    if (url.includes("storage.googleapis.com/")) {
      const match = url.match(/storage\.googleapis\.com\/([^?]+)/);
      if (match) {
        path = match[1];
      } else {
        console.error("Error refreshing image URL: No match found");
        return url;
      }

      if (bucket.name && path.startsWith(bucket.name + "/")) {
        path = path.substring(bucket.name.length + 1);
      }

      const gcsFile = bucket.file(path);
      const [signedUrl] = await gcsFile.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      return signedUrl;
    }

    // If URL format doesn't match, return original
    return url;
  } catch (err) {
    console.error("Error refreshing image URL:", err);
    return url;
  }
}