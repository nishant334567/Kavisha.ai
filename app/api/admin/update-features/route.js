import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { normalizeBrandHex } from "@/app/lib/brandTheme";
import {
  getBrandBySubdomain,
  updateBrandBySubdomain,
} from "@/app/lib/brandRepository";

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
        whatsappPhoneNumber,
        whatsappCloudPhoneNumberId,
      } = await req.json();

      const isAdmin = await isBrandAdmin(decodedToken.email, subdomain);
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Forbidden - not a brand admin" },
          { status: 403 }
        );
      }

      const brandData = await getBrandBySubdomain(subdomain);
      if (!brandData) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }

      const set = {};
      const unset = [];

      if (enableQuiz !== undefined) set.enableQuiz = enableQuiz;
      if (quizName !== undefined) set.quizName = quizName;
      if (enableJobs !== undefined) set.enableJobs = enableJobs;
      if (enableProducts !== undefined) set.enableProducts = enableProducts;
      if (enableCommunityOnboarding !== undefined) {
        set.enableCommunityOnboarding = enableCommunityOnboarding;
      }
      if (communityName !== undefined) set.communityName = communityName;
      if (enableProfessionalConnect !== undefined) {
        set.enableProfessionalConnect = enableProfessionalConnect;
      }
      if (enableFriendConnect !== undefined) set.enableFriendConnect = enableFriendConnect;
      if (enableBooking !== undefined) set.enableBooking = enableBooking;
      if (enableBlogs !== undefined) set.enableBlogs = enableBlogs;
      if (enableLinks !== undefined) set.enableLinks = enableLinks;

      if (primaryBrandColor !== undefined) {
        const raw =
          typeof primaryBrandColor === "string" ? primaryBrandColor.trim() : "";
        if (raw === "") {
          unset.push("primaryBrandColor");
        } else {
          const hex = normalizeBrandHex(raw);
          if (!hex) {
            return NextResponse.json(
              { error: "Invalid primary brand color (use #rrggbb or #rgb)" },
              { status: 400 }
            );
          }
          set.primaryBrandColor = hex;
        }
      }

      if (secondaryBrandColor !== undefined) {
        const raw =
          typeof secondaryBrandColor === "string"
            ? secondaryBrandColor.trim()
            : "";
        if (raw === "") {
          unset.push("secondaryBrandColor");
        } else {
          const hex = normalizeBrandHex(raw);
          if (!hex) {
            return NextResponse.json(
              { error: "Invalid secondary brand color (use #rrggbb or #rgb)" },
              { status: 400 }
            );
          }
          set.secondaryBrandColor = hex;
        }
      }

      if (whatsappPhoneNumber !== undefined) {
        set["widgetLauncher.whatsappPhoneNumberId"] =
          typeof whatsappPhoneNumber === "string" ? whatsappPhoneNumber.trim() : "";
      }
      if (whatsappCloudPhoneNumberId !== undefined) {
        set["widgetLauncher.whatsappCloudPhoneNumberId"] =
          typeof whatsappCloudPhoneNumberId === "string"
            ? whatsappCloudPhoneNumberId.trim()
            : "";
      }

      if (Object.keys(set).length === 0 && unset.length === 0) {
        return NextResponse.json(
          { error: "No updates provided" },
          { status: 400 }
        );
      }

      const updatedBrandData = await updateBrandBySubdomain(subdomain, {
        set,
        unset,
      });

      return NextResponse.json(updatedBrandData);
    },
  });
}
