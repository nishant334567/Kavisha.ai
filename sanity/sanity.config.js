// sanity/sanity.config.js
import { defineConfig } from "sanity";
import { deskTool } from "sanity/desk";
import { visionTool } from "@sanity/vision";
import { schema } from "./schemaTypes";

const projectId =
  process.env.SANITY_STUDIO_PROJECT_ID ||
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  "wkgir1xd";
const dataset =
  process.env.SANITY_STUDIO_DATASET ||
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  "development";

// Log which dataset is being used (helpful for debugging)

export default defineConfig({
  name: "default",
  title: `Kavisha Content (${dataset})`,

  projectId,
  dataset,

  plugins: [deskTool(), visionTool()],

  schema: {
    types: schema.types,
  },
});
