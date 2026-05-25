import { NextResponse } from "next/server";
import {
  getShopify,
  readBrandFromCookie,
  clearBrandCookie,
  getShopifySuccessRedirectUrl,
  registerShopifyWebhooks,
} from "@/app/lib/shopify";
import { saveShopifySession } from "@/app/lib/shopifyRepository";

export async function GET(req) {
  try {
    const shopify = getShopify(req);
    const { session, headers: oauthHeaders } = await shopify.auth.callback({
      rawRequest: req,
    });

    const brand =
      readBrandFromCookie(req) ||
      new URL(req.url).searchParams.get("brand") ||
      "";

    await saveShopifySession(session, brand);
    try {
      await registerShopifyWebhooks(shopify, session);
    } catch (webhookErr) {
      console.error("[shopify callback] Febhook register", webhookErr);
    }

    const redirectUrl = getShopifySuccessRedirectUrl(brand, req);
    const response = NextResponse.redirect(redirectUrl, 302);

    if (oauthHeaders) {
      const headerList = oauthHeaders instanceof Headers
        ? oauthHeaders
        : new Headers(oauthHeaders);
      headerList.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") {
          response.headers.append(key, value);
        }
      });
    }
    response.headers.append("Set-Cookie", clearBrandCookie(req));

    return response;
  } catch (err) {
    console.error("[shopify callback]", err);
    const message = err?.message || "Shopify OAuth callback failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
