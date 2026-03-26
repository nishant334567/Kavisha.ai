import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { connectDB } from "@/app/lib/db";
import { refreshImageUrl } from "@/app/lib/gcs";
import Job from "@/app/models/Job";

export async function GET(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const { id } = await params;
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
      const jdLink = job.jdLink ? await refreshImageUrl(job.jdLink) : "";
      return NextResponse.json({ job: { ...job, jdLink } });
    },
  });
}

export async function PATCH(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const { id } = await params;
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
      let body = {};
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }
      const newCategory = typeof body.addStatusCategory === "string"
        ? body.addStatusCategory.trim()
        : "";
      if (!newCategory) {
        return NextResponse.json({ error: "addStatusCategory required" }, { status: 400 });
      }
      await connectDB();
      const job = await Job.findOne({ _id: id, brand }).lean();
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      const categories = Array.isArray(job.statusCategories) ? job.statusCategories : [];
      const normalized = newCategory.toLowerCase();
      if (categories.some((c) => (c || "").toLowerCase() === normalized)) {
        return NextResponse.json({ error: "Category already exists" }, { status: 400 });
      }
      const updated = await Job.findByIdAndUpdate(
        id,
        { $push: { statusCategories: newCategory } },
        { new: true, lean: true }
      );
      return NextResponse.json({ success: true, job: updated });
    },
    onUnauthenticated: async () => {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    },
  });
}
