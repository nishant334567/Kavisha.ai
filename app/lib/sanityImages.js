import { client } from "@/app/lib/sanity";

/** Upload image asset to Sanity CDN (brand docs store `{ asset: { _ref } }` in Mongo). */
export async function uploadSanityImageAsset(buffer, filename) {
  if (!client) throw new Error("Sanity client not available");
  return client.assets.upload("image", buffer, { filename });
}
