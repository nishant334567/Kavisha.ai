"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useEffect, useState } from "react";
import { Bold, Italic, Heading1, Heading2, Heading3, ImagePlus } from "lucide-react";

export default function EmailEditor({ value, onChange, brand = "kavisha" }) {
    const [imageUploading, setImageUploading] = useState(false);
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
            Image,
        ],
        content: value || "<p></p>",
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none min-h-[250px] p-4 focus:outline-none",
            },
        },
    });

    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || "<p></p>");
        }
    }, [value, editor]);

    if (!editor) return null;

    const handleImageUpload = async (e) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        if (file.size > 500 * 1024) { alert("Image must be under 500KB"); return; }
        e.target.value = "";
        setImageUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("brand", brand);
            const res = await fetch("/api/admin/upload-email-image", {
              method: "POST",
              body: fd,
              headers: { "Accept": "application/json" },
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

    const ToolbarButton = ({ onClick, active, children, title }) => (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`px-3 py-1.5 rounded border text-sm font-medium transition-colors ${active
                ? "bg-[#004A4E] text-white border-[#004A4E]"
                : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50 shadow-sm"
                }`}
        >
            {children}
        </button>
    );

    return (
        <div className="space-y-3">
            <div className="flex gap-2 rounded-md border border-gray-200 p-2 bg-gray-100">
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
                <label className={`px-3 py-1.5 rounded border text-sm font-medium inline-flex items-center gap-1.5 min-w-[80px] justify-center ${imageUploading ? "border-[#004A4E] bg-[#004A4E]/10 text-[#004A4E] cursor-wait" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 cursor-pointer"}`}>
                    {imageUploading ? (
                        <>
                            <span className="email-editor-spinner" style={{ width: 14, height: 14, border: "2px solid #e5e7eb", borderTopColor: "#004A4E", borderRadius: "50%" }} />
                            <span>Uploading</span>
                        </>
                    ) : (
                        <>
                            <ImagePlus className="w-4 h-4" />
                            <span>Image</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={imageUploading} />
                        </>
                    )}
                </label>
            </div>
            <div className="rounded-md border border-gray-300 p-4 bg-white min-h-[250px] focus-within:ring-2 focus-within:ring-[#004A4E] focus-within:border-transparent transition-shadow">
                <EditorContent editor={editor} className="prose max-w-none" />
            </div>
        </div>
    );
}