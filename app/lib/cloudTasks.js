import { GoogleAuth } from "google-auth-library";

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function enqueueCloudTask({
  url,
  payload,
  taskNameSuffix,
  headers = {},
}) {
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
  const location =
    process.env.CLOUD_TASKS_LOCATION || process.env.GOOGLE_CLOUD_LOCATION;
  const queue = process.env.CLOUD_TASKS_QUEUE;

  if (!projectId) throw new Error("Missing GOOGLE_CLOUD_PROJECT / GCP_PROJECT_ID");
  if (!location) throw new Error("Missing CLOUD_TASKS_LOCATION / GOOGLE_CLOUD_LOCATION");
  if (!queue) throw new Error("Missing CLOUD_TASKS_QUEUE");

  const parent = `projects/${projectId}/locations/${location}/queues/${queue}`;
  const endpoint = `https://cloudtasks.googleapis.com/v2/${parent}/tasks`;

  const body = {
    task: {
      httpRequest: {
        httpMethod: "POST",
        url,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: Buffer.from(JSON.stringify(payload), "utf8").toString("base64"),
      },
    },
  };

  // If your Cloud Run service requires auth, set TASKS_OIDC_SERVICE_ACCOUNT_EMAIL
  // so Cloud Tasks includes an OIDC token when calling your endpoint.
  const oidcServiceAccountEmail = process.env.TASKS_OIDC_SERVICE_ACCOUNT_EMAIL;
  if (oidcServiceAccountEmail) {
    body.task.httpRequest.oidcToken = { serviceAccountEmail: oidcServiceAccountEmail };
  }

  // Optional deterministic task name (helps de-dupe when you build idempotency later)
  if (taskNameSuffix) {
    body.task.name = `${parent}/tasks/${taskNameSuffix}`;
  }

  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token?.token || token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cloud Tasks enqueue failed: ${res.status} ${text}`);
  }

  return res.json();
}

