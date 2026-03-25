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
                className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    {hasPaymentLayout ? (
                        <>
                            <h3 className="mb-4 text-center text-lg font-semibold text-highlight">
                                {title}
                            </h3>
                            <div className="space-y-0 border-t border-border">
                                {rows.map((row, i) => (
                                    <div
                                        key={i}
                                        className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0"
                                    >
                                        <span className="text-sm text-foreground">{row.label}</span>
                                        <div className="text-right">
                                            <span className={`text-sm ${row.isAmount ? "font-semibold text-foreground" : "text-foreground"}`}>
                                                {row.value}
                                            </span>
                                            {row.note && (
                                                <p className="mt-0.5 text-xs text-muted">{row.note}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="mb-6 text-center text-base text-highlight sm:text-lg">
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
                        className="flex-1 rounded-full bg-muted-bg px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card"
                        onClick={onCancel}
                    >
                        {cancelLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
