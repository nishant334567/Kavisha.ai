import { NextResponse } from "next/server";
import { runBlogFeedSyncAndIngest } from "@/app/lib/blogFeedSyncAndIngest";
import { sendCronReport } from "@/app/lib/cronReportEmail";

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// POST only – same auth as /api/admin/cron (Bearer CRON_SECRET)
export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runBlogFeedSyncAndIngest({ disconnectAfter: false });
    const {
      feedUrl,
      articleUrlsCount,
      upserted,
      ingestOk,
      ingestFail,
      ingestFailures = [],
    } = result;
    const failList =
      Array.isArray(ingestFailures) && ingestFailures.length > 0
        ? `<ul>${ingestFailures
            .map(
              (f) =>
                `<li><code>${escapeHtml(f.url)}</code><br/>${escapeHtml(f.error)}</li>`
            )
            .join("")}</ul>`
        : "";
    await sendCronReport({
      subject: `[Cron] Blog sync+ingest ok`,
      html: `<p>
        Feed: ${escapeHtml(feedUrl)}<br/>
        Article URLs in feed: ${articleUrlsCount}<br/>
        New rows upserted: ${upserted}<br/>
        Ingest OK: ${ingestOk}<br/>
        Ingest failed: ${ingestFail}
      </p>
      ${
        ingestFail > 0
          ? `<p><strong>Ingest errors</strong> (see also <code>BlogIngestUrl.lastError</code>):</p>${failList || "<p>(no per-URL messages)</p>"}`
          : ""
      }
      <p><small>Ingest runs for every row with <code>ingested !== true</code> in Mongo, not only URLs newly seen in this RSS fetch.</small></p>`,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron] blog sync+ingest error:", err);
    await sendCronReport({
      subject: `[Cron] Blog sync+ingest failed`,
      html: `<p>Error: ${escapeHtml(err?.message ?? "Blog sync+ingest failed")}</p>`,
    });
    return NextResponse.json(
      { success: false, error: err?.message ?? "Blog sync+ingest failed" },
      { status: 500 }
    );
  }
}
