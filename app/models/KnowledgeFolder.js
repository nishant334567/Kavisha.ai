import mongoose from "mongoose";

const KnowledgeFolderSchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KnowledgeFolder",
      required: false,
      default: null,
    },
  },
  { timestamps: true }
);

KnowledgeFolderSchema.index({ brand: 1 });

const KnowledgeFolder =
  mongoose.models.KnowledgeFolder ||
  mongoose.model("KnowledgeFolder", KnowledgeFolderSchema);

export default KnowledgeFolder;
