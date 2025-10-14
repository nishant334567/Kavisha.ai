import mongoose from "mongoose";

const ChunksSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  brand: {
    type: String,
    required: true,
  },
  chunkId: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Chunks = mongoose.models.Chunks || mongoose.model("Chunks", ChunksSchema);

export default Chunks;
