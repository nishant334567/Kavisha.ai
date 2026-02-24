import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { connectDB } from "@/app/lib/db";
import { uploadToBucket } from "@/app/lib/gcs";
import Job from "@/app/models/Job";
import JobApplication from "@/app/models/JobApplication";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const jobId = formData.get("jobId")?.toString()?.trim();
    const applicantEmail = formData.get("applicantEmail")?.toString()?.trim()?.toLowerCase();
    const resume = formData.get("resume");
    const questionsAnswersRaw = formData.get("questionsAnswers");

    if (!jobId) {
      return NextResponse.json({ success: false, error: "jobId is required" }, { status: 400 });
    }
    if (!applicantEmail) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }
    if (!resume || typeof resume.arrayBuffer !== "function") {
      return NextResponse.json({ success: false, error: "Resume file is required" }, { status: 400 });
    }

    await connectDB();

    const job = await Job.findById(jobId).lean();
    if (!job) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    // One application per applicant (email) per job
    const existing = await JobApplication.findOne({ jobId, applicantEmail }).lean();
    if (existing) {
      return NextResponse.json(
        { success: false, error: "You have already applied for this job." },
        { status: 409 }
      );
    }

    let questionsAnswers = [];
    try {
      const parsed = typeof questionsAnswersRaw === "string" ? JSON.parse(questionsAnswersRaw) : questionsAnswersRaw;
      if (Array.isArray(parsed)) questionsAnswers = parsed;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid questionsAnswers" }, { status: 400 });
    }

    const expectedQuestions = job.questions || [];
    if (expectedQuestions.length !== questionsAnswers.length) {
      return NextResponse.json(
        { success: false, error: "All questions must be answered" },
        { status: 400 }
      );
    }
    const validQa = questionsAnswers.every(
      (qa) => qa && typeof qa.question === "string" && typeof qa.answer === "string"
    );
    if (!validQa) {
      return NextResponse.json(
        { success: false, error: "Invalid question-answer format" },
        { status: 400 }
      );
    }

    const name = (resume.name || "resume").replace(/[^a-zA-Z0-9._-]/g, "_");
    const gcsPath = `resumes/${jobId}/${uuidv4()}_${name}`;
    const resumeLink = await uploadToBucket(gcsPath, resume, resume.type);
    if (!resumeLink) {
      return NextResponse.json(
        { success: false, error: "Failed to upload resume (storage not configured)" },
        { status: 500 }
      );
    }

    await JobApplication.create({
      jobId,
      applicantEmail,
      resumeLink,
      questionsAnswers: questionsAnswers.map((qa) => ({
        question: qa.question,
        answer: qa.answer || "",
      })),
    });

    return NextResponse.json({ success: true, message: "Application submitted" });
  } catch (err) {
    console.error("job-apply POST:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to submit application" },
      { status: 500 }
    );
  }
}
