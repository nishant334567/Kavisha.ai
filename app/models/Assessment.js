const mongoose = require("mongoose");

const AssessmentSchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["quiz", "survey"],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    subtitle: String,
    objective: String,
    instructions: String,

    totalMarks: Number,
    durationInMinutes: Number,

    // Survey-specific fields
    legend: {
      type: String,
      default: null, // JSON string or plain text describing the response scale
    },
    scoringInfo: {
      type: String,
      default: null, // Instructions on how to calculate scores
    },
    trends: {
      type: String,
      default: null, // Interpretation guide based on score ranges
    },
  },
  { timestamps: true }
);

const Assessments =
  mongoose.models.Assessments ||
  mongoose.model("Assessments", AssessmentSchema);
module.exports = Assessments;
