"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState } from "react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  List,
  ListOrdered,
} from "lucide-react";

export default function BlogEditor({
  value,
  onChange,
  brand = "kavisha",
  placeholder = "Write your blog post...",
}) {
  const [imageUploading, setImageUploading] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[280px] py-4 px-3 focus:outline-none",
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
      if (data?.url)
        editor.chain().focus().setImage({ src: data.url, width: 560 }).run();
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
      className={`p-2 rounded transition-colors ${
        active
          ? "bg-gray-200 text-gray-900"
          : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="rounded-xl border border-gray-300 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-3 py-2">
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
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          active={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet list"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered list"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <label
          className={`inline-flex items-center gap-1.5 p-2 rounded cursor-pointer transition-colors ${
            imageUploading
              ? "text-[#2D545E]"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
          }`}
        >
          {imageUploading ? (
            <span
              className="inline-block w-4 h-4 border-2 border-gray-200 border-t-[#2D545E] rounded-full animate-spin"
              aria-hidden
            />
          ) : (
            <ImagePlus className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">Image</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            disabled={imageUploading}
          />
        </label>
      </div>
      <EditorContent editor={editor} className="p-4" />
    </div>
  );
}
