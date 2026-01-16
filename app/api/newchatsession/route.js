import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import { createSessionWithDefaultLog } from "@/app/lib/createSessionWithDefaultLog";

export async function POST(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      const { role, brand, initialmessage, isCommunityChat, chatName } =
        await request.json();
      const user = await getUserFromDB(decodedToken.email);

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const sid = await createSessionWithDefaultLog(
        user.id,
        role,
        brand,
        initialmessage || null,
        isCommunityChat,
        chatName
      );
      return NextResponse.json({ success: true, sessionId: sid._id });
    },
  });
}
