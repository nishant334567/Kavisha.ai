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
            className={`rounded px-2 py-1.5 text-sm font-medium transition-colors ${active ? "bg-muted-bg text-foreground" : "text-muted hover:bg-muted-bg hover:text-foreground"
                }`}
        >
            {children}
        </button>
    );

    return (
        <div className="mx-auto max-w-4xl px-6 py-6 text-foreground">
            {/* Toolbar: B, I, H1, H2, H3, Image */}
            <div className="mb-6 flex items-center gap-1 border-b border-border pb-3">
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
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium transition-colors ${imageUploading ? "text-highlight" : "text-muted hover:bg-muted-bg hover:text-foreground"
                        }`}
                >
                    {imageUploading ? (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-highlight" aria-hidden />
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
                    className="block w-full border-0 bg-transparent text-2xl font-normal text-foreground placeholder:text-muted focus:outline-none focus:ring-0"
                />
                <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a subtitle"
                    className="block w-full border-0 bg-transparent text-base font-normal text-foreground placeholder:text-muted focus:outline-none focus:ring-0"
                />
            </div>

            {/* Body editor (Tiptap) */}
            <div className="rounded-md border border-border bg-card transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30">
                <EditorContent editor={editor} className="p-4" />
            </div>
        </div>
    );
}
