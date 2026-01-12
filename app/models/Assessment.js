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

    gradingMode: {
      type: String,
      enum: ["auto", "llm"],
      default: "none",
    },

    totalMarks: Number,
    durationInMinutes: Number,
  },
  { timestamps: true }
);

const Assessments =
  mongoose.models.Assessments ||
  mongoose.model("Assessments", AssessmentSchema);
module.exports = Assessments;
