// sanity/sanity.config.js
import { defineConfig } from "sanity";
import { deskTool } from "sanity/desk";
import { visionTool } from "@sanity/vision";
import { schema } from "./schemaTypes";

export default defineConfig({
  name: "default",
  title: "Kavisha Content",

  projectId: "wkgir1xd",
  dataset: "development",

  plugins: [deskTool(), visionTool()],

  schema: {
    types: schema.types,
  },
});
