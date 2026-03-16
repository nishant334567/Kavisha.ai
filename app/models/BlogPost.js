import mongoose from "mongoose";

const BlogPostSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    excerpt: { type: String, default: "" },
    featuredImage: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    publishedAt: { type: Date, default: null },
    author: { type: String, default: "" },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
  },
  { timestamps: true }
);

BlogPostSchema.index({ brand: 1, slug: 1 }, { unique: true });
BlogPostSchema.index({ brand: 1, status: 1, publishedAt: -1 });

const BlogPost =
  mongoose.models.BlogPost || mongoose.model("BlogPost", BlogPostSchema);
export default BlogPost;
