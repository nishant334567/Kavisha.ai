// sanity/sanity.cli.js
import { defineCliConfig } from "sanity/cli";

const projectId =
  process.env.SANITY_STUDIO_PROJECT_ID ||
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  "wkgir1xd";
const dataset =
  process.env.SANITY_STUDIO_DATASET ||
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  "development";

export default defineCliConfig({
  api: {
    projectId,
    dataset,
  },
  studioHost: "kavisha",
});
