import { GoogleAuth } from "google-auth-library";

export function hasCloudTasksConfig() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
  const location = process.env.CLOUD_TASKS_LOCATION || process.env.GOOGLE_CLOUD_LOCATION;
  const queue = process.env.CLOUD_TASKS_QUEUE;
  return Boolean(projectId && location && queue);
}

export function getTasksBaseUrl(request) {
  return (
    process.env.PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    new URL(request.url).origin
  );
}

export function tasksAuthHeaders() {
  return process.env.TASKS_SECRET
    ? { "x-tasks-secret": process.env.TASKS_SECRET }
    : {};
}

export async function enqueueCloudTask({
  url,
  payload,
  taskNameSuffix,
  headers = {},
}) {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
  const location = process.env.CLOUD_TASKS_LOCATION || process.env.GOOGLE_CLOUD_LOCATION;
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

  // Deterministic task name enables de-dupe.
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
    const err = new Error(`Cloud Tasks enqueue failed: ${res.status} ${text}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

export function isCloudTaskAlreadyQueued(err) {
  return err?.status === 409 || String(err?.message || "").includes("ALREADY_EXISTS");
}

