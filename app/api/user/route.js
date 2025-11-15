import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";

export async function GET(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      const user = await getUserFromDB(decodedToken.email);

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json({ user });
    },
    onUnauthenticated: async () => {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    },
  });
}
