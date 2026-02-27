"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState } from "react";
import { Bold, Italic, Heading1, Heading2, Heading3, ImagePlus } from "lucide-react";

export default function EmailEditor({
    value,
    onChange,
    brand = "kavisha",
    onHeaderChange,
}) {
    const [imageUploading, setImageUploading] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        onHeaderChange?.({ title, description });
    }, [title, description, onHeaderChange]);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
            Image,
            Placeholder.configure({ placeholder: "Start writing..." }),
        ],
        content: value || "<p></p>",
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none min-h-[160px] py-4 focus:outline-none",
            },
        },
    });

    useEffect(() => {
        if (editor && value !== undefined && value !== editor.getHTML()) {
            editor.commands.setContent(value || "<p></p>");
        }
    }, [value, editor]);

    const handleImageUpload = async (e) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        if (file.size > 500 * 1024) {
            alert("Image must be under 500KB");
            return;
        }
        e.target.value = "";
        setImageUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("brand", brand);
            const res = await fetch("/api/admin/upload-email-image", {
                method: "POST",
                body: fd,
                headers: { Accept: "application/json" },
            });
            const data = await res.json().catch(() => ({}));
            if (data?.url) editor.chain().focus().setImage({ src: data.url, width: 560 }).run();
            else alert(data?.error || "Upload failed");
        } catch (err) {
            console.error(err);
        } finally {
            setImageUploading(false);
        }
    };

    if (!editor) return null;

    const ToolbarButton = ({ onClick, active, children, title: btnTitle }) => (
        <button
            type="button"
            onClick={onClick}
            title={btnTitle}
            className={`px-2 py-1.5 text-sm font-medium rounded transition-colors ${active ? "bg-gray-200 text-gray-900" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                }`}
        >
            {children}
        </button>
    );

    return (
        <div className="max-w-4xl mx-auto px-6 py-6">
            {/* Toolbar: B, I, H1, H2, H3, Image */}
            <div className="flex items-center gap-1 border-b border-gray-200 pb-3 mb-6">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    active={editor.isActive("bold")}
                    title="Bold"
                >
                    <Bold className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    active={editor.isActive("italic")}
                    title="Italic"
                >
                    <Italic className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    active={editor.isActive("heading", { level: 1 })}
                    title="Heading 1"
                >
                    <Heading1 className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    active={editor.isActive("heading", { level: 2 })}
                    title="Heading 2"
                >
                    <Heading2 className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    active={editor.isActive("heading", { level: 3 })}
                    title="Heading 3"
                >
                    <Heading3 className="w-4 h-4" />
                </ToolbarButton>
                <label
                    className={`inline-flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium rounded cursor-pointer transition-colors ${imageUploading ? "text-[#004A4E]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                        }`}
                >
                    {imageUploading ? (
                        <span className="inline-block w-4 h-4 border-2 border-gray-200 border-t-[#004A4E] rounded-full animate-spin" aria-hidden />
                    ) : (
                        <ImagePlus className="w-4 h-4" />
                    )}
                    <span>Image</span>
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={imageUploading}
                    />
                </label>
            </div>

            <div className="space-y-3 mb-6">
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title"
                    className="block w-full text-2xl font-normal text-gray-900 placeholder:text-gray-400 bg-transparent border-0 focus:outline-none focus:ring-0"
                />
                <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a subtitle"
                    className="block w-full text-base font-normal text-gray-900 placeholder:text-gray-400 bg-transparent border-0 focus:outline-none focus:ring-0"
                />
            </div>

            {/* Body editor (Tiptap) */}
            <div className="rounded-md border border-gray-200 focus-within:border-gray-300 focus-within:ring-1 focus-within:ring-gray-200 transition-colors">
                <EditorContent editor={editor} className="p-4" />
            </div>
        </div>
    );
}
