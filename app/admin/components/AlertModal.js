import { X } from "lucide-react";

export default function AlertModal({ message, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex w-full max-w-md flex-col items-center rounded-xl border border-border bg-card p-6 text-center text-foreground shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <p className="pr-8 text-base font-medium text-foreground">{message}</p>
      </div>
    </div>
  );
}
