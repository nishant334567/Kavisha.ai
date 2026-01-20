"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function TextTrainingModal({
  isOpen,
  onClose,
  onSave,
  initialTitle = "",
  initialContent = "",
  isEditMode = false,
  folders = [],
  folderId = "",
  onFolderChange,
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setContent(initialContent);
    } else {
      setTitle("");
      setContent("");
    }
  }, [isOpen, initialTitle, initialContent]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (onSave && title && content) {
      onSave({
        title,
        content,
        ...(onFolderChange && { folderId: folderId ?? "" }),
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isEditMode ? "Edit Document" : "Text Based Training"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 bg-gray-50">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3 tracking-wide">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 text-gray-900"
            />
          </div>
          {onFolderChange && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3 tracking-wide">
                Folder
              </label>
              <select
                value={folderId}
                onChange={(e) => onFolderChange(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all duration-200 text-gray-900"
              >
                <option value="">Unfiled</option>
                {folders.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3 tracking-wide">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your content here..."
              rows={14}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent resize-none transition-all duration-200 placeholder:text-gray-400 text-gray-900 leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title || !content}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
          >
            {isEditMode ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
