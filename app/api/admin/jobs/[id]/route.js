import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { connectDB } from "@/app/lib/db";
import Job from "@/app/models/Job";

export async function GET(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const id = params?.id;
      const brand = req.nextUrl.searchParams.get("brand")?.trim();
      if (!id || !brand) {
        return NextResponse.json({ error: "id and brand required" }, { status: 400 });
      }
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
      }
      const isAdmin = await isBrandAdmin(decodedToken.email, brand);
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await connectDB();
      const job = await Job.findOne({ _id: id, brand }).lean();
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      return NextResponse.json({ job });
    },
  });
}
