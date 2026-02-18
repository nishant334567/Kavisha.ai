import { X } from "lucide-react";

export default function AlertModal({ message, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative flex flex-col items-center text-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <p className="text-gray-800 text-base font-medium pr-8">{message}</p>
      </div>
    </div>
  );
}
