import mongoose from "mongoose";

const JobApplicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    applicantEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    applicantName: { type: String, default: "", trim: true },
    applicantImage: { type: String, default: "", trim: true },
    status: { type: String, default: "new", trim: true },
    starred: { type: Boolean, default: false },
    assignedTo: [{ type: String, trim: true }],
    resumeLink: { type: String, required: true, trim: true },
    questionsAnswers: [
      {
        question: { type: String, required: true },
        answer: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

JobApplicationSchema.index({ jobId: 1, createdAt: -1 });
JobApplicationSchema.index({ jobId: 1, applicantEmail: 1 }, { unique: true });

const JobApplication =
  mongoose.models.JobApplication ||
  mongoose.model("JobApplication", JobApplicationSchema);

export default JobApplication;
