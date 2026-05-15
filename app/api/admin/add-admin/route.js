import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import {
  getBrandBySubdomain,
  getBrandAdmins,
  updateBrandBySubdomain,
} from "@/app/lib/brandRepository";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const ROOT_HOST = process.env.NODE_ENV === "staging" ? "staging.kavisha.ai" : "kavisha.ai";

async function sendAdminAccessEmail(to, name, subdomain) {
  if (!resend) return;
  const url = `https://${subdomain}.${ROOT_HOST}/admin/${subdomain}/v2`;
  await resend.emails.send({
    from: "hello@kavisha.ai",
    to: [to],
    subject: "You have been given admin access",
    html: `
      <p>Hello ${name || "there"},</p>
      <p>You were given admin access. You can check the dashboard at:</p>
      <p><a href="${url}">${url}</a></p>
    `,
  });
}

export async function GET(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const brand = new URL(req.url).searchParams.get("brand");
      if (!brand) {
        return NextResponse.json({ error: "brand required" }, { status: 400 });
      }
      const ok = await isBrandAdmin(decodedToken.email, brand);
      if (!ok) {
        return NextResponse.json({ error: "Forbidden - not a brand admin" }, { status: 403 });
      }
      const admins = await getBrandAdmins(brand);
      return NextResponse.json({ admins });
    },
  });
}

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const { name, email, brand } = await req.json();
      if (!email?.trim() || !brand) {
        return NextResponse.json({ error: "email and brand required" }, { status: 400 });
      }
      const ok = await isBrandAdmin(decodedToken.email, brand);
      if (!ok) {
        return NextResponse.json({ error: "Forbidden - not a brand admin" }, { status: 403 });
      }
      const brandData = await getBrandBySubdomain(brand);
      if (!brandData) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }
      const current = brandData.admins || [];
      const em = email.trim().toLowerCase();
      if (current.map((e) => e?.toLowerCase()).includes(em)) {
        return NextResponse.json({ error: "Already an admin" }, { status: 400 });
      }
      const next = [...current, em];
      await updateBrandBySubdomain(brand, { set: { admins: next } });
      sendAdminAccessEmail(em, (name || "").trim() || em, brand).catch(() => {});
      return NextResponse.json({ ok: true, admins: next });
    },
  });
}

export async function DELETE(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const brand = new URL(req.url).searchParams.get("brand");
      const email = new URL(req.url).searchParams.get("email");
      if (!brand || !email?.trim()) {
        return NextResponse.json({ error: "brand and email required" }, { status: 400 });
      }
      const ok = await isBrandAdmin(decodedToken.email, brand);
      if (!ok) {
        return NextResponse.json({ error: "Forbidden - not a brand admin" }, { status: 403 });
      }
      const brandData = await getBrandBySubdomain(brand);
      if (!brandData) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }
      const current = brandData.admins || [];
      const em = email.trim().toLowerCase();
      const next = current.filter((e) => (e || "").toLowerCase() !== em);
      if (next.length === 0) {
        return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 400 });
      }
      if (next.length === current.length) {
        return NextResponse.json({ error: "Admin not found" }, { status: 404 });
      }
      await updateBrandBySubdomain(brand, { set: { admins: next } });
      return NextResponse.json({ ok: true, admins: next });
    },
  });
}
