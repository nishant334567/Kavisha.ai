import { NextResponse } from "next/server";
import { Resend } from "resend";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { createUnsubscribeToken } from "@/app/lib/unsubscribe-token";
import { getKavishaFooterHtml, wrapCentered } from "@/app/lib/kavisha-email-utils";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import User from "@/app/models/Users";
import BlogPost from "@/app/models/BlogPost";
import EmailUnsubscribe from "@/app/models/EmailUnsubscribe";
import SentEmailLog from "@/app/models/SentEmailLog";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kavisha.ai";

function getBrandBaseUrl(brand) {
  const sub = String(brand || "kavisha").trim().toLowerCase();
  if (sub === "kavisha") return BASE_URL;
  return `https://${sub}.kavisha.ai`;
}

function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildPostHtml(post, blogUrl) {
  const title = post.title || "Blog post";
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const excerpt = post.excerpt
    ? `<p style="font-size:14px;color:#6b7280;margin:12px 0 20px;line-height:1.5;">${escapeHtml(post.excerpt)}</p>`
    : "";
  const content = post.content || "";
  const readMore = blogUrl
    ? `<p style="margin-top:24px;"><a href="${escapeHtml(blogUrl)}" style="color:#004A4E;text-decoration:underline;">Read on the blog</a></p>`
    : "";
  return `
<div style="font-family:system-ui,sans-serif;color:#111;">
  <h1 style="font-size:24px;margin:0 0 8px;">${escapeHtml(title)}</h1>
  ${date ? `<p style="font-size:12px;color:#6b7280;margin:0;">${escapeHtml(date)}</p>` : ""}
  ${excerpt}
  <div style="font-size:15px;line-height:1.6;margin-top:16px;">${content}</div>
  ${readMore}
</div>`;
}

/** Load post, recipients (after unsub filter), blogUrl, postBodyHtml. Call after connectDB(). */
async function getBlogEmailPayload(brandVal, slugVal) {
  const post = await BlogPost.findOne({
    brand: brandVal,
    slug: slugVal,
    status: "published",
  })
    .select("title excerpt content publishedAt")
    .lean();

  if (!post) return null;

  const userIds = await Session.distinct("userId", {
    brand: brandVal,
    isCommunityChat: { $ne: true },
  });
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }).select("email name").lean()
    : [];
  const recipients = users
    .filter((u) => u && u.email)
    .map((u) => ({
      email: String(u.email).trim().toLowerCase(),
      name: (u.name || "").trim() || u.email,
    }));

  const unsubscribed = await EmailUnsubscribe.find(
    { brand: brandVal },
    { email: 1, _id: 0 }
  ).lean();
  const unsubSet = new Set(unsubscribed.map((u) => u.email.toLowerCase()));
  const toSend = recipients.filter((r) => r.email && !unsubSet.has(r.email));

  const blogUrl = `${getBrandBaseUrl(brandVal)}/blogs/${encodeURIComponent(slugVal)}`;
  const postBodyHtml = buildPostHtml(post, blogUrl);

  return { post, recipients, toSend, blogUrl, postBodyHtml };
}

/** GET: preview + recipients (no send). Query: brand, slug. */
export async function GET(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { searchParams } = new URL(req.url);
        const brandVal = (searchParams.get("brand") || "").toString().trim().toLowerCase();
        const slugVal = (searchParams.get("slug") || "").toString().trim();

        if (!brandVal || !slugVal) {
          return NextResponse.json(
            { success: false, error: "brand and slug are required" },
            { status: 400 }
          );
        }

        const isAdmin = await isBrandAdmin(decodedToken.email, brandVal);
        if (!isAdmin) {
          return NextResponse.json(
            { success: false, error: "Only brand admins can preview blog email" },
            { status: 403 }
          );
        }

        await connectDB();
        const payload = await getBlogEmailPayload(brandVal, slugVal);
        if (!payload) {
          return NextResponse.json(
            { success: false, error: "Published post not found" },
            { status: 404 }
          );
        }

        const { post, recipients, toSend, postBodyHtml } = payload;
        const sampleToken = createUnsubscribeToken({
          email: "preview@example.com",
          brand: brandVal,
          avatarId: null,
        });
        const previewHtml = wrapCentered(
          postBodyHtml + getKavishaFooterHtml(sampleToken)
        );

        return NextResponse.json({
          success: true,
          title: post.title || "Blog post",
          recipients: toSend,
          totalCount: toSend.length,
          skippedUnsubscribed: recipients.length - toSend.length,
          previewHtml,
        });
      } catch (error) {
        console.error("blog-email-preview:", error);
        return NextResponse.json(
          { success: false, error: "Failed to load preview", details: error?.message },
          { status: 500 }
        );
      }
    },
  });
}

const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 500;

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { brand, slug } = await req.json().catch(() => ({}));
        const brandVal = (brand || "").toString().trim().toLowerCase();
        const slugVal = (slug || "").toString().trim();

        if (!brandVal || !slugVal) {
          return NextResponse.json(
            { success: false, error: "brand and slug are required" },
            { status: 400 }
          );
        }

        const isAdmin = await isBrandAdmin(decodedToken.email, brandVal);
        if (!isAdmin) {
          return NextResponse.json(
            { success: false, error: "Only brand admins can send blog by email" },
            { status: 403 }
          );
        }

        if (!resend) {
          return NextResponse.json(
            { success: false, error: "Email service not configured (RESEND_API_KEY)." },
            { status: 500 }
          );
        }

        await connectDB();
        const payload = await getBlogEmailPayload(brandVal, slugVal);
        if (!payload) {
          return NextResponse.json(
            { success: false, error: "Published post not found" },
            { status: 404 }
          );
        }

        const { post, recipients, toSend, postBodyHtml } = payload;

        if (toSend.length === 0) {
          return NextResponse.json({
            success: true,
            message: recipients.length
              ? `No emails sent. All ${recipients.length} recipient(s) are unsubscribed.`
              : "No recipients. No users have chatted with this avatar yet.",
            sentCount: 0,
            skippedCount: recipients.length,
          });
        }

        const fromEmail = process.env.RESEND_FROM || "hello@kavisha.ai";
        const fromName = brandVal.charAt(0).toUpperCase() + brandVal.slice(1);
        const from = `${fromName} <${fromEmail}>`;
        const subject = post.title || "New blog post";

        const allEmails = toSend.map((r) => {
          const token = createUnsubscribeToken({
            email: r.email,
            brand: brandVal,
            avatarId: null,
          });
          const html = wrapCentered(postBodyHtml + getKavishaFooterHtml(token));
          return { from, to: [r.email], subject, html };
        });

        const delay = (ms) => new Promise((r) => setTimeout(r, ms));
        const sentAt = new Date();
        const buildLogDoc = (r, status) => ({
          brand: brandVal,
          toEmail: r.email,
          subject,
          type: "blog",
          sentAt,
          status,
        });

        for (let i = 0; i < allEmails.length; i += BATCH_SIZE) {
          const chunk = allEmails.slice(i, i + BATCH_SIZE);
          const chunkRecipients = toSend.slice(i, i + BATCH_SIZE);
          const { error } = await resend.batch.send(chunk);
          if (error) {
            await SentEmailLog.insertMany(
              chunkRecipients.map((r) => buildLogDoc(r, "failed"))
            ).catch(() => {});
            return NextResponse.json(
              { success: false, error: error.message },
              { status: 500 }
            );
          }
          await delay(BATCH_DELAY_MS);
        }

        await SentEmailLog.insertMany(
          toSend.map((r) => buildLogDoc(r, "sent"))
        ).catch(() => {});

        const skipped = recipients.length - toSend.length;
        return NextResponse.json({
          success: true,
          message: `Sent to ${toSend.length} recipient(s).${skipped ? ` ${skipped} skipped (unsubscribed).` : ""}`,
          sentCount: toSend.length,
          skippedCount: skipped,
        });
      } catch (error) {
        console.error("send-blog-email:", error);
        return NextResponse.json(
          { success: false, error: "Failed to send blog email", details: error?.message },
          { status: 500 }
        );
      }
    },
  });
}
