"use client";

export default function ConfirmModal({ isOpen, message, onConfirm, onCancel, confirmLabel = "OK", cancelLabel = "Cancel" }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30" onClick={onCancel}>
            <div
                className="bg-card border border-border shadow-2xl rounded-xl font-fredoka w-full max-w-sm p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <p className="text-[#004A4E] text-base sm:text-lg mb-6 text-center">
                    {message}
                </p>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        className="flex-1 rounded-full bg-[#004A4E] text-white px-4 py-2.5 text-sm hover:bg-[#003538] transition-colors"
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                    <button
                        type="button"
                        className="flex-1 rounded-full border border-border bg-muted-bg text-foreground px-4 py-2.5 text-sm hover:bg-border/50 transition-colors"
                        onClick={onCancel}
                    >
                        {cancelLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
