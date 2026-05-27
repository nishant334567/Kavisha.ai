import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { connectDB } from "@/app/lib/db";
import TrainingData from "@/app/models/TrainingData";
import { normalizeWebsiteUrl } from "@/app/lib/websiteScrapeContent";

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const body = await req.json().catch(() => ({}));
        const { brand, urls } = body;

        if (!brand) {
          return NextResponse.json(
            { error: "Brand is required" },
            { status: 400 }
          );
        }

        if (!Array.isArray(urls) || urls.length === 0) {
          return NextResponse.json({ savedByUrl: {} });
        }

        if (urls.length > 100) {
          return NextResponse.json(
            { error: "At most 100 URLs per request" },
            { status: 400 }
          );
        }

        const admin = await isBrandAdmin(decodedToken.email, brand);
        if (!admin) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const keyToListUrl = new Map();
        for (const raw of urls) {
          const listUrl = String(raw || "").trim();
          if (!listUrl) continue;
          const key = normalizeWebsiteUrl(listUrl);
          if (key && !keyToListUrl.has(key)) {
            keyToListUrl.set(key, listUrl);
          }
        }

        if (keyToListUrl.size === 0) {
          return NextResponse.json({ savedByUrl: {} });
        }

        await connectDB();

        const docs = await TrainingData.find({
          brand,
          sourceUrl: { $exists: true, $nin: ["", null] },
        })
          .select("sourceUrl docid title updatedAt createdAt")
          .lean();

        const savedByUrl = {};
        for (const doc of docs) {
          const key = normalizeWebsiteUrl(doc.sourceUrl);
          const listUrl = keyToListUrl.get(key);
          if (!listUrl || savedByUrl[listUrl]) continue;

          savedByUrl[listUrl] = {
            docid: doc.docid,
            title: doc.title || "",
            savedAt: doc.updatedAt || doc.createdAt || null,
          };
        }

        return NextResponse.json({ savedByUrl });
      } catch (error) {
        console.error("[admin/website-kb-urls]", error);
        return NextResponse.json(
          { error: error?.message || "Failed to look up saved URLs" },
          { status: 500 }
        );
      }
    },
  });
}
