import { NextResponse } from "next/server";
import { client, urlFor } from "@/app/lib/sanity";
import { normalizeBrandHex } from "@/app/lib/brandTheme";

/**
 * Public read for embed widget + optional clients. No auth.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const brand = (searchParams.get("brand") || searchParams.get("subdomain") || "")
    .trim()
    .toLowerCase();

  if (!brand || !/^[a-z0-9-]+$/.test(brand)) {
    return NextResponse.json({ error: "Invalid brand" }, { status: 400 });
  }

  if (!client) {
    return NextResponse.json({
      primaryBrandColor: null,
      secondaryBrandColor: null,
      widgetLauncherImageUrl: null,
      widgetLauncherAnimation: false,
      widgetChatbotHeader: null,
      widgetCopyReadMoreUrl: null,
      enableAdminMessages: false,
      enableFriendConnect: false,
      enableProfessionalConnect: false,
    });
  }

  try {
    const data = await client.fetch(
      `*[_type == "brand" && subdomain == $brand][0]{
        primaryBrandColor,
        secondaryBrandColor,
        enableAdminMessages,
        enableFriendConnect,
        enableProfessionalConnect,
        widgetLauncher{
          buttonImage,
          enableAttentionAnimation,
          chatbotWidgetHeader,
          copyReadMoreUrl
        }
      }`,
      { brand }
    );

    const wl = data?.widgetLauncher;
    const headerRaw =
      typeof wl?.chatbotWidgetHeader === "string"
        ? wl.chatbotWidgetHeader.trim()
        : "";
    const widgetChatbotHeader = headerRaw.length > 0 ? headerRaw : null;

    const readMoreRaw =
      typeof wl?.copyReadMoreUrl === "string"
        ? wl.copyReadMoreUrl.trim()
        : "";
    const widgetCopyReadMoreUrl = readMoreRaw.length > 0 ? readMoreRaw : null;

    let widgetLauncherImageUrl = null;
    if (wl?.buttonImage && urlFor) {
      try {
        widgetLauncherImageUrl = urlFor(wl.buttonImage)
          .width(128)
          .height(128)
          .fit("max")
          .auto("format")
          .url();
      } catch {
        widgetLauncherImageUrl = null;
      }
    }

    return NextResponse.json(
      {
        primaryBrandColor: normalizeBrandHex(data?.primaryBrandColor),
        secondaryBrandColor: normalizeBrandHex(data?.secondaryBrandColor),
        widgetLauncherImageUrl,
        widgetLauncherAnimation: Boolean(wl?.enableAttentionAnimation),
        widgetChatbotHeader,
        widgetCopyReadMoreUrl,
        enableAdminMessages: Boolean(data?.enableAdminMessages),
        enableFriendConnect: Boolean(data?.enableFriendConnect),
        enableProfessionalConnect: Boolean(data?.enableProfessionalConnect),
      },
    );
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load brand theme" },
      { status: 500 }
    );
  }
}
