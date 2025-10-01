import mongoose from "mongoose";

const ChunksSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
    },
});

// Avoid OverwriteModelError in Next.js hot reload/runtime by reusing the compiled model
const Chunks = mongoose.models.Chunks || mongoose.model("Chunks", ChunksSchema);

export default Chunks