import mongoose from "mongoose";

const AdminCommentSchema = new mongoose.Schema(
    {
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ChatSessions",
            required: true,
            index: true,
        },
        comment: {
            type: String,
            required: true,
        },
        authorName: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

const AdminComment =
    mongoose.models.AdminComment ||
    mongoose.model("AdminComment", AdminCommentSchema);

export default AdminComment;
