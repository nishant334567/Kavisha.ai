import mongoose from "mongoose";

const TrainingDataSchema = new mongoose.Schema({
  docid: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
    maxlength: 20,
  },
  description: {
    type: String,
    required: false,
    maxlength: 200,
  },
  brand: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  totalChunks: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const TrainingData =
  mongoose.models.TrainingData ||
  mongoose.model("TrainingData", TrainingDataSchema);

export default TrainingData;
