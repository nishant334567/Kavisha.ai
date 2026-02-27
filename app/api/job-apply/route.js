import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { connectDB } from "@/app/lib/db";
import { uploadToBucket } from "@/app/lib/gcs";
import { getGeminiModel } from "@/app/lib/getAiModel";
import Job from "@/app/models/Job";
import JobApplication from "@/app/models/JobApplication";

const SUMMARY_PROMPT = `You are summarizing a job application for an admin. Below are the exact questions and the applicant's answers.

Write a short, factual summary (2–4 sentences) so an admin can quickly see what the applicant answered for each question. Use the applicant's actual words, numbers, and choices—e.g. "Currently 30 LPA, expecting 40 LPA; based in Mumbai; prefers hybrid." Cover every topic they answered (salary, location, experience, role, work mode, etc.). Do NOT use generic intros like "This summary outlines..." or "Details regarding...". Only state the key answers in plain, scannable language.`;

async function summarizeApplication(questionsAnswers) {
  if (!Array.isArray(questionsAnswers) || questionsAnswers.length === 0) return "";
  const text = questionsAnswers
    .map((qa) => `Q: ${qa.question || ""}\nA: ${qa.answer || ""}`)
    .join("\n\n");
  const model = getGeminiModel("gemini-2.5-flash");
  if (!model) return "";
  try {
    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: `${SUMMARY_PROMPT}\n\n---\n\n${text}` }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
    });
    const summary =
      res?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    return summary.slice(0, 2000);
  } catch {
    return "";
  }
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const jobId = formData.get("jobId")?.toString()?.trim();
    const applicantEmail = formData.get("applicantEmail")?.toString()?.trim()?.toLowerCase();
    const applicantName = formData.get("applicantName")?.toString()?.trim() || "";
    const applicantImage = formData.get("applicantImage")?.toString()?.trim() || "";
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

    const applicationSummary = await summarizeApplication(questionsAnswers);

    await JobApplication.create({
      jobId,
      applicantEmail,
      applicantName,
      applicantImage,
      resumeLink,
      questionsAnswers: questionsAnswers.map((qa) => ({
        question: qa.question,
        answer: qa.answer || "",
      })),
      applicationSummary: applicationSummary || "",
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
