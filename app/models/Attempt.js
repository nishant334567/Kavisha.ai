const mongoose = require("mongoose");

const AttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessments",
      required: true,
    },
    // Quiz-specific fields (optional for surveys)
    score: {
      type: Number,
      default: null,
    },
    totalMarks: {
      type: Number,
      default: null,
    },
    correctCount: {
      type: Number,
      default: null,
    },
    // Survey-specific fields
    surveyResponse: {
      type: [
        {
          questionText: String,
          questionId: mongoose.Schema.Types.ObjectId,
          selectedAnswers: [String], // Array of answer text values (not IDs)
        },
      ],
      default: null,
    },
    // Report field (flexible - can store JSON, string, or object)
    // For quizzes: contains score, percentage, questionResults
    // For surveys: contains LLM-generated analysis/report
    report: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    // Common fields
    status: {
      type: String,
      enum: ["in-progress", "completed", "abandoned"],
      default: "in-progress",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
AttemptSchema.index({ userId: 1 });
AttemptSchema.index({ assessmentId: 1 });
AttemptSchema.index({ status: 1 });

const Attempts =
  mongoose.models.Attempts || mongoose.model("Attempts", AttemptSchema);
module.exports = Attempts;
