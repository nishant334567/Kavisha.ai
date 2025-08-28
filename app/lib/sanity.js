import { createClient } from "next-sanity";

export const client = createClient({
  projectId: "wkgir1xd",
  dataset: "development",
  apiVersion: "2025-01-01",
  useCdn: false,
});
