import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Events from "@/app/models/Events";
import { withAuth } from "@/app/lib/firebase/auth-middleware";

export async function GET(request, { params }) {
  return withAuth(request, {
    onAuthenticated: async () => {
      try {
        const { brandName } = await params;
        await connectDB();

        const events = await Events.find({
          brandName: brandName.toLowerCase(),
        }).sort({
          createdAt: -1,
        });

        return NextResponse.json({ events });
      } catch (error) {
        return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
      }
    },
  });
}
