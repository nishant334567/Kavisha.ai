"use client";

export default function ConfirmModal({
    isOpen,
    message,
    title,
    rows,
    onConfirm,
    onCancel,
    confirmLabel = "OK",
    cancelLabel = "Cancel",
}) {
    if (!isOpen) return null;

    const hasPaymentLayout = title && Array.isArray(rows) && rows.length > 0;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30" onClick={onCancel}>
            <div
                className="bg-white border border-gray-200 shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    {hasPaymentLayout ? (
                        <>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                                {title}
                            </h3>
                            <div className="space-y-0 border-t border-gray-200">
                                {rows.map((row, i) => (
                                    <div
                                        key={i}
                                        className="flex justify-between items-start gap-4 py-3 border-b border-gray-200 last:border-b-0"
                                    >
                                        <span className="text-sm text-gray-900">{row.label}</span>
                                        <div className="text-right">
                                            <span className={`text-sm ${row.isAmount ? "font-semibold text-gray-900" : "text-gray-900"}`}>
                                                {row.value}
                                            </span>
                                            {row.note && (
                                                <p className="text-xs text-gray-400 mt-0.5">{row.note}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-[#004A4E] text-base sm:text-lg mb-6 text-center">
                            {message}
                        </p>
                    )}
                </div>
                <div className="flex gap-3 px-6 pb-6">
                    <button
                        type="button"
                        className="flex-1 rounded-full bg-[#3D606E] text-white px-4 py-2.5 text-sm font-medium hover:bg-[#345663] transition-colors"
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                    <button
                        type="button"
                        className="flex-1 rounded-full bg-[#E6F5F2] text-[#3D606E] px-4 py-2.5 text-sm font-medium hover:bg-[#d6ede9] transition-colors"
                        onClick={onCancel}
                    >
                        {cancelLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
