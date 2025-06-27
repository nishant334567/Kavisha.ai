import mongoose from "mongoose";

const RequirementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatSessions",
      required: true,
    },
    profile_type: {
      type: String,
      enum: ["job_seeker", "recruiter"],
      required: true,
    },
    current_role: { type: String, default: null },
    desired_role: { type: String, default: null },
    experience: { type: Number, default: null },
    current_ctc: { type: String, default: null },
    expected_ctc: { type: String, default: null },
    location_preference: { type: String, default: null },
    notice_period: { type: String, default: null },
    work_mode: { type: String, default: null },

    // Recruiter-specific
    role_title: { type: String, default: null },
    salary_range: { type: String, default: null },
    jd_summary: { type: String, default: null },
    freelance_ok: { type: Boolean, default: null },
  },
  { timestamps: true }
);

const Requirement =
  mongoose.models.Requirement ||
  mongoose.model("Requirement", RequirementSchema);
export default Requirement;
