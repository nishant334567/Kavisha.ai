import { client } from "@/app/lib/sanity";
import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";

export async function PATCH(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const { subdomain, enableQuiz, quizName, enableCommunityOnboarding, communityName } =
        await req.json();

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
      if (enableCommunityOnboarding !== undefined)
        updateData.enableCommunityOnboarding = enableCommunityOnboarding;
      if (communityName !== undefined) updateData.communityName = communityName;

      const updatedBrandData = await client
        .patch(brandData._id)
        .set(updateData)
        .commit();

      return NextResponse.json(updatedBrandData);
    },
  });
}
