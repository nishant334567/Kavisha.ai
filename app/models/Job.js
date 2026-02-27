import mongoose from "mongoose";

const JobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    questions: [{ type: String }],
    jdLink: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true, index: true },
    statusCategories: { type: [String], default: [] }, // Admin-defined; no defaults
  },
  { timestamps: true }
);

const Job = mongoose.models.Job || mongoose.model("Job", JobSchema);
export default Job;
