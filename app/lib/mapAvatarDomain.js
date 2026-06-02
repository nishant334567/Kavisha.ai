import { GoogleAuth } from "google-auth-library";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const REGION = "us-central1";

const auth = new GoogleAuth({
  ...(process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY
    ? {
      credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
    }
    : {}),
  scopes: "https://www.googleapis.com/auth/cloud-platform",
});

export async function mapAvatarDomain({ subdomain, rootHost, serviceName }) {
  const sub = String(subdomain || "").trim().toLowerCase();
  const host = String(rootHost || "").trim();
  const route = String(serviceName || "").trim();
  if (!sub || !host || !route) return;

  const domainName = `${sub}.${host}`;
  const token = await getGcpAccessToken();

  const response = await fetch(
    `https://${REGION}-run.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/domainmappings`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        apiVersion: "domains.cloudrun.com/v1",
        kind: "DomainMapping",
        metadata: { name: domainName, namespace: PROJECT_ID },
        spec: { routeName: route },
      }),
    }
  );

  if (!response.ok) {
    let detail = "";
    try {
      const data = await response.json();
      detail = data?.error?.message || data?.error || data?.message || "";
    } catch {
      // ignore
    }
    throw new Error(
      detail || `Domain mapping failed (${response.status}) for ${domainName}`
    );
  }
}

async function getGcpAccessToken() {
  const gcpClient = await auth.getClient();
  return (await gcpClient.getAccessToken()).token;
}

function parseDomainMappingStatus(data, domain) {
  const ready = (data?.status?.conditions || []).find((c) => c.type === "Ready");
  if (ready?.status === "True") {
    return { state: "ready", domain, url: `https://${domain}` };
  }
  if (ready?.status === "False") {
    return { state: "failed", domain };
  }
  return { state: "pending", domain };
}

/** GCP Cloud Run DomainMapping status: pending | ready | failed */
export async function getAvatarDomainMappingStatus(domainName) {
  const domain = String(domainName || "").trim().toLowerCase();
  if (!domain || !PROJECT_ID) return { state: "unknown", domain };

  let token;
  try {
    token = await getGcpAccessToken();
  } catch (err) {
    console.error("getAvatarDomainMappingStatus: auth", err);
    return { state: "unknown", domain };
  }

  const url = `https://${REGION}-run.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/domainmappings/${encodeURIComponent(domain)}`;

  let response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch (err) {
    console.error("getAvatarDomainMappingStatus: fetch", err);
    return { state: "unknown", domain };
  }

  if (response.status === 404) return { state: "pending", domain };
  if (!response.ok) {
    console.error("getAvatarDomainMappingStatus:", response.status);
    return { state: "unknown", domain };
  }

  try {
    return parseDomainMappingStatus(await response.json(), domain);
  } catch (err) {
    console.error("getAvatarDomainMappingStatus: parse", err);
    return { state: "unknown", domain };
  }
}
