import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { createOrGetUser } from "@/app/lib/firebase/create-user";

export async function GET(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      // Create user if they don't exist (same as login flow)
      const dbUser = await createOrGetUser(decodedToken);

      console.log("user check in db in api/user", dbUser);
      const user = {
        id: dbUser._id.toString(),
        email: dbUser.email,
        name: dbUser.name,
        image: dbUser.image,
        profileType: dbUser.profileType,
        isAdmin: dbUser.isAdmin || false,
      };

      return NextResponse.json({ user });
    },
    onUnauthenticated: async () => {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    },
  });
}
