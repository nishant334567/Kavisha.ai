import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { trainDocument } from "@/app/lib/trainDocument";
import { isSubstantiveContent } from "@/app/lib/scrapePageQuality";
import {
  normalizeWebsiteUrl,
  resolveDocumentTitle,
  resolveTrainingText,
} from "@/app/lib/websiteScrapeContent";
import { ensureWebsiteFolder } from "@/app/lib/websiteFolder";

export const maxDuration = 600;

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const body = await req.json().catch(() => ({}));
        const { brand, pages, folderId, seedUrl } = body;

        if (!brand) {
          return NextResponse.json(
            { error: "Brand is required" },
            { status: 400 }
          );
        }

        if (!Array.isArray(pages) || pages.length === 0) {
          return NextResponse.json(
            { error: "No pages to save" },
            { status: 400 }
          );
        }

        if (pages.length > 50) {
          return NextResponse.json(
            { error: "You can save at most 50 pages per batch" },
            { status: 400 }
          );
        }

        const admin = await isBrandAdmin(decodedToken.email, brand);
        if (!admin) {
          return NextResponse.json(
            { error: "Forbidden - not a brand admin" },
            { status: 403 }
          );
        }

        let targetFolderId = folderId || null;
        if (!targetFolderId && seedUrl) {
          const folder = await ensureWebsiteFolder(brand, seedUrl);
          targetFolderId = folder.folderId;
        }

        const seen = new Set();
        const imported = [];
        const failed = [];
        const skipped = [];
        let substantiveCount = 0;

        for (const item of pages) {
          const sourceUrl = (item.sourceUrl || item.url || "").trim();
          const listUrl = (item.url || sourceUrl || "").trim();
          const dedupeKey = normalizeWebsiteUrl(listUrl);
          if (dedupeKey && seen.has(dedupeKey)) {
            skipped.push({ sourceUrl, reason: "Duplicate page" });
            continue;
          }
          if (dedupeKey) seen.add(dedupeKey);

          const title = resolveDocumentTitle({
            label: item.label,
            url: item.url || sourceUrl,
            pageTitle: item.pageTitle || item.title,
          });
          const fullTitle = title.trim();
          const titleDb =
            fullTitle.length > 50 ? fullTitle.substring(0, 50) : fullTitle;

          const rawText = (item.content || item.text || "").trim();
          const text = resolveTrainingText(rawText, {
            prepared: item.prepared === true,
            sourceUrl,
            seedUrl: seedUrl || "",
          });

          if (!text) {
            failed.push({
              sourceUrl,
              url: listUrl,
              error: "Empty content after preparation",
            });
            continue;
          }

          try {
            const result = await trainDocument({
              brand,
              title: titleDb,
              text,
              description: titleDb,
              sourceUrl,
              embeddingProfile: "bulk",
              ...(targetFolderId && { folderId: targetFolderId }),
            });
            const substantive = isSubstantiveContent(text);
            if (substantive) substantiveCount += 1;
            imported.push({
              title: titleDb,
              docid: result.docid,
              chunkCount: result.chunkIds?.length || 0,
              sourceUrl,
              url: item.url || sourceUrl,
              substantive,
            });
          } catch (e) {
            console.error(
              "[save-website-pages] train failed",
              listUrl || sourceUrl,
              e?.message
            );
            failed.push({
              sourceUrl,
              url: listUrl,
              error: e?.message || "Training failed",
            });
          }
        }

        let message = `Saved ${imported.length} page${imported.length === 1 ? "" : "s"} to your knowledge base`;
        if (failed.length) message += ` (${failed.length} failed)`;
        if (skipped.length) {
          message += ` (${skipped.length} duplicate${skipped.length === 1 ? "" : "s"} skipped)`;
        }

        if (imported.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: "No pages could be saved to the knowledge base",
              message,
              imported,
              failed,
              skipped,
              scrapedCount: 0,
              substantiveCount: 0,
              folderId: targetFolderId,
            },
            { status: 422 }
          );
        }

        return NextResponse.json({
          success: true,
          message,
          imported,
          failed,
          skipped,
          scrapedCount: imported.length,
          substantiveCount,
          folderId: targetFolderId,
        });
      } catch (error) {
        console.error("[admin/save-website-pages]", error);
        return NextResponse.json(
          { error: error?.message || "Save failed" },
          { status: 500 }
        );
      }
    },
  });
}
