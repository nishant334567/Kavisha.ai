import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Events from "@/app/models/Events";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";

export async function POST(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const user = await getUserFromDB(decodedToken.email);
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        await connectDB();

        const { title, description, link, contentType, brandName } =
          await request.json();

        if (!title || !description || !contentType) {
          return NextResponse.json(
            { error: "Title, description and content type are required" },
            { status: 400 }
          );
        }

        const newEvent = new Events({
          title,
          description,
          link: link || "",
          contentType,
          userId: user.id,
          brandName,
        });

        await newEvent.save();

        return NextResponse.json({
          success: true,
          message: "Created successfully",
        });
      } catch (error) {
        return NextResponse.json(
          { error: "Failed to create" },
          { status: 500 }
        );
      }
    },
  });
}
