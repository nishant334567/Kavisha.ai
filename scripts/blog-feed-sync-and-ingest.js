/**
 * Manual / local: RSS sync + blog ingest (same code path as POST /api/admin/cron/blog).
 */
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const envLocal = path.join(root, ".env.local");
const envUpper = path.join(root, ".ENV.LOCAL");
if (fs.existsSync(envLocal)) require("dotenv").config({ path: envLocal });
else if (fs.existsSync(envUpper)) require("dotenv").config({ path: envUpper });
else require("dotenv").config({ path: envLocal });

const { runBlogFeedSyncAndIngest } = require("../app/lib/blogFeedSyncAndIngest.js");

runBlogFeedSyncAndIngest({ disconnectAfter: true })
  .then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
