const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema(
  {
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessments",
      required: true,
    },

    questionText: {
      type: String,
      required: true,
    },

    questionType: {
      type: String,
      enum: ["single_choice", "multi_choice"],
      required: true,
    },

    options: [
      {
        id: { type: String, required: true },
        text: { type: String, required: true },
      },
    ],

    correctAnswer: mongoose.Schema.Types.Mixed,
    evaluationHint: String,

    maxMarks: {
      type: Number,
      default: 1,
    },

    order: {
      type: Number,
      required: true,
    },

    required: {
      type: Boolean,
      default: true,
    },

    images: [String]
  },
  { timestamps: true }
);

const Questions =
  mongoose.models.Questions || mongoose.model("Questions", QuestionSchema);
module.exports = Questions;
