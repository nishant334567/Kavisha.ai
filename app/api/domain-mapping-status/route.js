import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { getAvatarDomainMappingStatus } from "@/app/lib/mapAvatarDomain";
import { getKavishaRootHost } from "@/app/lib/kavishaSiteEnv";

function normalizeSubdomain(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.(staging\.)?kavisha\.ai$/i, "");
}

function domainFromSubdomain(subdomain, siteOpts) {
  const sub = normalizeSubdomain(subdomain);
  if (!sub) return "";
  return `${sub}.${getKavishaRootHost(siteOpts)}`;
}

export async function GET(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      const { searchParams } = new URL(request.url);
      const siteOpts = { request };
      const subdomain = normalizeSubdomain(searchParams.get("subdomain"));
      const domainParam = String(searchParams.get("domain") || "")
        .trim()
        .toLowerCase();

      const domain =
        domainParam || (subdomain ? domainFromSubdomain(subdomain, siteOpts) : "");

      if (!domain) {
        return NextResponse.json(
          { error: "subdomain or domain is required." },
          { status: 400 }
        );
      }

      const subForAuth = subdomain || normalizeSubdomain(domain.split(".")[0]);
      if (subForAuth) {
        const allowed = await isBrandAdmin(decodedToken.email, subForAuth);
        if (!allowed) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      const status = await getAvatarDomainMappingStatus(domain);
      return NextResponse.json(status);
    },
  });
}
