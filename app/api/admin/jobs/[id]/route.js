import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { connectDB } from "@/app/lib/db";
import { refreshImageUrl } from "@/app/lib/gcs";
import Job from "@/app/models/Job";
import JobApplication from "@/app/models/JobApplication";

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

      const setPublished = typeof body.published === "boolean";
      const newCategory =
        typeof body.addStatusCategory === "string" ? body.addStatusCategory.trim() : "";

      if (!setPublished && !newCategory) {
        return NextResponse.json(
          { error: "Send published (boolean) and/or addStatusCategory (string)" },
          { status: 400 }
        );
      }

      await connectDB();
      const job = await Job.findOne({ _id: id, brand }).lean();
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      const update = {};
      if (setPublished) {
        update.$set = { published: body.published };
      }
      if (newCategory) {
        const categories = Array.isArray(job.statusCategories) ? job.statusCategories : [];
        if (categories.some((c) => (c || "").toLowerCase() === newCategory.toLowerCase())) {
          return NextResponse.json({ error: "Category already exists" }, { status: 400 });
        }
        update.$push = { statusCategories: newCategory };
      }

      const updated = await Job.findByIdAndUpdate(id, update, { new: true, lean: true });
      return NextResponse.json({ success: true, job: updated });
    },
    onUnauthenticated: async () => {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    },
  });
}

export async function DELETE(req, { params }) {
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
      const deleted = await Job.findOneAndDelete({ _id: id, brand });
      if (!deleted) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      await JobApplication.deleteMany({ jobId: id });
      return NextResponse.json({ success: true });
    },
    onUnauthenticated: async () =>
      NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
  });
}
