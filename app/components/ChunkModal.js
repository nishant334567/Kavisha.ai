"use client";
import { X } from "lucide-react";

export default function ChunkModal({ isOpen, onClose, chunk }) {
  if (!isOpen || !chunk) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Source Chunk</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="mb-4">
          <p className="text-xs text-gray-500 font-mono">ID: {chunk.id}</p>
        </div>
        {chunk.title && (
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-700">
              Title: {chunk.title}
            </p>
          </div>
        )}
        <div className="flex-1 overflow-y-auto mb-4">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {chunk.text || "No text available"}
          </p>
        </div>
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
