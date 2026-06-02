import { NextResponse } from "next/server";
import {
  getShopify,
  readBrandFromCookie,
  clearBrandCookie,
  getShopifyOnboardingWelcomeUrl,
  getShopifyWelcomeRedirectUrl,
  registerShopifyWebhooks,
} from "@/app/lib/shopify";
import {
  saveShopifySession,
  linkShopifyToBrand,
} from "@/app/lib/shopifyRepository";
import { connectDB } from "@/app/lib/db";
import ShopifyMerchant from "@/app/models/ShopifyMerchant";
import {
  createBrandDocument,
  getBrandByShopifyShopUrl,
  resolveAvailableSubdomainFromName,
} from "@/app/lib/brandRepository";
import { DEFAULT_LOGIN_BUTTON_TEXT } from "@/app/lib/loginButtonText";
import { fetchShopInfo } from "@/app/lib/shopify/adminGraphql";

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

    const shop = String(session.shop || "").trim().toLowerCase();

    await saveShopifySession(session, brand);
    if (brand && shop) {
      await linkShopifyToBrand(shop, brand);
    }
    // If install wasn't initiated from an existing brand admin, provision a minimal brand now.
    let provisionedBrand = "";
    if (!brand && shop) {
      try {
        await connectDB();
        const existingByShop = await getBrandByShopifyShopUrl(shop);
        if (existingByShop?.subdomain) {
          provisionedBrand = String(existingByShop.subdomain).trim().toLowerCase();
        } else {
          const merchant = await ShopifyMerchant.findOne({
            shopDomain: shop,
            uninstalledAt: null,
          })
            .select("brandSubdomain")
            .lean();
          const linked = String(merchant?.brandSubdomain || "")
            .trim()
            .toLowerCase();
          if (linked) {
            provisionedBrand = linked;
          }
        }

        if (!provisionedBrand) {
          const info = await fetchShopInfo(session).catch(() => null);
          const shopName =
            (info?.name && String(info.name).trim()) || shop.replace(/\.myshopify\.com$/i, "");
          const subdomain =
            await resolveAvailableSubdomainFromName(shopName);
          if (subdomain) {
            const now = Date.now();
            const avatarName = shopName || subdomain || "this store";
            const services = [
              {
                _key: `lead_journey_${now}`,
                name: "lead_journey",
                title: "Talk to me",
                initialMessage: "Hello, How can I assist you today?",
                about: "",
                behaviour: `You are ${avatarName}'s digital avatar.`,
                rules: "Don't use abusive language. Be calm and polite.",
              },
            ];

            await createBrandDocument({
              brandName: shopName || subdomain,
              loginButtonText: DEFAULT_LOGIN_BUTTON_TEXT,
              title: `Welcome to ${shopName || subdomain}`,
              subtitle: "",
              subdomain,
              admins: [],
              services,
              shopifyShopUrl: shop,
              enableProducts: true,
              talkToAvatarPublished: false,
            });

            provisionedBrand = subdomain;
          }
        }

        if (provisionedBrand) {
          await linkShopifyToBrand(shop, provisionedBrand);
        }
      } catch (provisionErr) {
        console.error("[shopify callback] provision brand", provisionErr);
      }
    }
    try {
      await registerShopifyWebhooks(shopify, session);
    } catch (webhookErr) {
      console.error("[shopify callback] webhook register", webhookErr);
    }

    const effectiveBrand = brand || provisionedBrand;
    const redirectUrl = effectiveBrand
      ? getShopifyOnboardingWelcomeUrl(effectiveBrand, req, shop)
      : getShopifyWelcomeRedirectUrl(req, shop);
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
