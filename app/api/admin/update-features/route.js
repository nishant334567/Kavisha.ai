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
