import { client } from "@/app/lib/sanity";
import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { normalizeBrandHex } from "@/app/lib/brandTheme";

export async function PATCH(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const {
        subdomain,
        enableQuiz,
        quizName,
        enableJobs,
        enableProducts,
        enableBooking,
        enableBlogs,
        enableLinks,
        enableCommunityOnboarding,
        communityName,
        enableProfessionalConnect,
        enableFriendConnect,
        primaryBrandColor,
        secondaryBrandColor,
        communityColorsMatchWidget,
        communityPrimaryBrandColor,
        communitySecondaryBrandColor,
        widgetLauncherEnableAttentionAnimation,
        unsetWidgetLauncherButtonImage,
        widgetLauncherChatbotHeader,
        widgetLauncherCopyReadMoreUrl,
        supportChannelEmail,
        supportChannelSlackUrl,
      } = await req.json();

      // Check if requester is admin for this brand
      const isAdmin = await isBrandAdmin(decodedToken.email, subdomain);
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Forbidden - not a brand admin" },
          { status: 403 }
        );
      }

      const brandData = await client.fetch(
        `*[_type == "brand" && subdomain == "${subdomain}"][0]`
      );

      if (!brandData) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }

      const updateData = {};
      if (enableQuiz !== undefined) updateData.enableQuiz = enableQuiz;
      if (quizName !== undefined) updateData.quizName = quizName;
      if (enableJobs !== undefined) updateData.enableJobs = enableJobs;
      if (enableProducts !== undefined) updateData.enableProducts = enableProducts;
      if (enableCommunityOnboarding !== undefined)
        updateData.enableCommunityOnboarding = enableCommunityOnboarding;
      if (communityName !== undefined) updateData.communityName = communityName;
      if (enableProfessionalConnect !== undefined) updateData.enableProfessionalConnect = enableProfessionalConnect;
      if (enableFriendConnect !== undefined) updateData.enableFriendConnect = enableFriendConnect;
      if (enableBooking !== undefined) updateData.enableBooking = enableBooking;
      if (enableBlogs !== undefined) updateData.enableBlogs = enableBlogs;
      if (enableLinks !== undefined) updateData.enableLinks = enableLinks;
      if (communityColorsMatchWidget !== undefined) {
        updateData.communityColorsMatchWidget = Boolean(communityColorsMatchWidget);
      }

      let patch = client.patch(brandData._id);
      let hasOps = false;

      if (Object.keys(updateData).length > 0) {
        patch = patch.set(updateData);
        hasOps = true;
      }

      if (primaryBrandColor !== undefined) {
        const raw =
          typeof primaryBrandColor === "string" ? primaryBrandColor.trim() : "";
        if (raw === "") {
          patch = patch.unset(["primaryBrandColor"]);
        } else {
          const hex = normalizeBrandHex(raw);
          if (!hex) {
            return NextResponse.json(
              { error: "Invalid primary brand color (use #rrggbb or #rgb)" },
              { status: 400 }
            );
          }
          patch = patch.set({ primaryBrandColor: hex });
        }
        hasOps = true;
      }

      if (secondaryBrandColor !== undefined) {
        const raw =
          typeof secondaryBrandColor === "string"
            ? secondaryBrandColor.trim()
            : "";
        if (raw === "") {
          patch = patch.unset(["secondaryBrandColor"]);
        } else {
          const hex = normalizeBrandHex(raw);
          if (!hex) {
            return NextResponse.json(
              { error: "Invalid secondary brand color (use #rrggbb or #rgb)" },
              { status: 400 }
            );
          }
          patch = patch.set({ secondaryBrandColor: hex });
        }
        hasOps = true;
      }

      if (communityPrimaryBrandColor !== undefined) {
        const raw =
          typeof communityPrimaryBrandColor === "string"
            ? communityPrimaryBrandColor.trim()
            : "";
        if (raw === "") {
          patch = patch.unset(["communityPrimaryBrandColor"]);
        } else {
          const hex = normalizeBrandHex(raw);
          if (!hex) {
            return NextResponse.json(
              { error: "Invalid community primary color (use #rrggbb or #rgb)" },
              { status: 400 }
            );
          }
          patch = patch.set({ communityPrimaryBrandColor: hex });
        }
        hasOps = true;
      }

      if (communitySecondaryBrandColor !== undefined) {
        const raw =
          typeof communitySecondaryBrandColor === "string"
            ? communitySecondaryBrandColor.trim()
            : "";
        if (raw === "") {
          patch = patch.unset(["communitySecondaryBrandColor"]);
        } else {
          const hex = normalizeBrandHex(raw);
          if (!hex) {
            return NextResponse.json(
              { error: "Invalid community secondary color (use #rrggbb or #rgb)" },
              { status: 400 }
            );
          }
          patch = patch.set({ communitySecondaryBrandColor: hex });
        }
        hasOps = true;
      }

      if (unsetWidgetLauncherButtonImage === true) {
        patch = patch.unset(["widgetLauncher.buttonImage"]);
        hasOps = true;
      }

      if (widgetLauncherEnableAttentionAnimation !== undefined) {
        const rawWl = brandData.widgetLauncher;
        const wl =
          rawWl && typeof rawWl === "object" && !Array.isArray(rawWl)
            ? { ...rawWl }
            : {};
        wl.enableAttentionAnimation = Boolean(
          widgetLauncherEnableAttentionAnimation,
        );
        patch = patch.set({ widgetLauncher: wl });
        hasOps = true;
      }

      if (
        widgetLauncherChatbotHeader !== undefined ||
        widgetLauncherCopyReadMoreUrl !== undefined
      ) {
        const rawWl = brandData.widgetLauncher;
        const wl =
          rawWl && typeof rawWl === "object" && !Array.isArray(rawWl)
            ? { ...rawWl }
            : {};

        if (widgetLauncherChatbotHeader !== undefined) {
          const h =
            typeof widgetLauncherChatbotHeader === "string"
              ? widgetLauncherChatbotHeader.trim()
              : "";
          if (h === "") delete wl.chatbotWidgetHeader;
          else wl.chatbotWidgetHeader = h;
        }

        if (widgetLauncherCopyReadMoreUrl !== undefined) {
          const u =
            typeof widgetLauncherCopyReadMoreUrl === "string"
              ? widgetLauncherCopyReadMoreUrl.trim()
              : "";
          if (u === "") delete wl.copyReadMoreUrl;
          else {
            try {
              const parsed = new URL(u);
              if (
                parsed.protocol !== "https:" &&
                parsed.protocol !== "http:"
              ) {
                return NextResponse.json(
                  { error: "Read more URL must use http:// or https://" },
                  { status: 400 },
                );
              }
              wl.copyReadMoreUrl = u;
            } catch {
              return NextResponse.json(
                { error: "Invalid read more URL" },
                { status: 400 },
              );
            }
          }
        }

        patch = patch.set({ widgetLauncher: wl });
        hasOps = true;
      }

      if (
        supportChannelEmail !== undefined ||
        supportChannelSlackUrl !== undefined
      ) {
        const rawSc = brandData.supportChannel;
        const sc =
          rawSc && typeof rawSc === "object" && !Array.isArray(rawSc)
            ? { ...rawSc }
            : {};

        if (supportChannelEmail !== undefined) {
          const e =
            typeof supportChannelEmail === "string"
              ? supportChannelEmail.trim()
              : "";
          if (e === "") {
            delete sc.email;
          } else {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
              return NextResponse.json(
                { error: "Invalid support email address" },
                { status: 400 },
              );
            }
            sc.email = e;
          }
        }

        if (supportChannelSlackUrl !== undefined) {
          const s =
            typeof supportChannelSlackUrl === "string"
              ? supportChannelSlackUrl.trim()
              : "";
          if (s === "") {
            delete sc.slackUrl;
          } else {
            try {
              const parsed = new URL(s);
              if (
                parsed.protocol !== "https:" &&
                parsed.protocol !== "http:"
              ) {
                return NextResponse.json(
                  { error: "Slack URL must use http:// or https://" },
                  { status: 400 },
                );
              }
              sc.slackUrl = s;
            } catch {
              return NextResponse.json(
                { error: "Invalid Slack URL" },
                { status: 400 },
              );
            }
          }
        }

        patch = patch.set({ supportChannel: sc });
        hasOps = true;
      }

      if (!hasOps) {
        return NextResponse.json(
          { error: "No updates provided" },
          { status: 400 }
        );
      }

      const updatedBrandData = await patch.commit();

      return NextResponse.json(updatedBrandData);
    },
  });
}
