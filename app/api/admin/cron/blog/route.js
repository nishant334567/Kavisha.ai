import { NextResponse } from "next/server";
import { runBlogFeedSyncAndIngest } from "@/app/lib/blogFeedSyncAndIngest";
import { sendCronReport } from "@/app/lib/cronReportEmail";

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
    } = result;
    await sendCronReport({
      subject: `[Cron] Blog sync+ingest ok`,
      html: `<p>
        Feed: ${feedUrl}<br/>
        Article URLs in feed: ${articleUrlsCount}<br/>
        New rows upserted: ${upserted}<br/>
        Ingest OK: ${ingestOk}<br/>
        Ingest failed: ${ingestFail}
      </p>`,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron] blog sync+ingest error:", err);
    await sendCronReport({
      subject: `[Cron] Blog sync+ingest failed`,
      html: `<p>Error: ${err?.message ?? "Blog sync+ingest failed"}</p>`,
    });
    return NextResponse.json(
      { success: false, error: err?.message ?? "Blog sync+ingest failed" },
      { status: 500 }
    );
  }
}
