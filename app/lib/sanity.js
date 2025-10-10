import { createClient } from "next-sanity";
import imageUrlBuilder from "@sanity/image-url";

// Only create client if we have the required environment variables
const getClient = () => {
  if (
    typeof window === "undefined" &&
    !process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  ) {
    // During build time, return a mock client
    return null;
  }

  return createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "wkgir1xd",
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "development",
    apiVersion: "2025-01-01",
    useCdn: false,
    token: process.env.SANITY_API_TOKEN, // Add token for mutations
  });
};

export const client = getClient();

// Get a pre-configured url-builder from your sanity client
const builder = client ? imageUrlBuilder(client) : null;

// Then we like to make a simple function like this that gives the
// builder an image and returns the builder for you to specify additional
// parameters:
export function urlFor(source) {
  if (!builder) {
    return null;
  }
  return builder.image(source);
}
