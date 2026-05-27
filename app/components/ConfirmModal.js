"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  message,
  title,
  rows,
  onConfirm,
  onCancel,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  variant = "default",
  alertOnly = false,
}) {
  if (!isOpen) return null;

  const hasPaymentLayout = title && Array.isArray(rows) && rows.length > 0;
  const isDanger = variant === "danger";
  const isSuccess = variant === "success";
  const isError = variant === "error";
  const singleButton = alertOnly || isSuccess || isError;

  const dismiss = () => {
    onCancel?.();
  };

  const handlePrimary = () => {
    onConfirm?.();
    if (singleButton) onCancel?.();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={dismiss}
      role="presentation"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
      >
        <div className="px-6 pt-6 pb-2">
          {hasPaymentLayout ? (
            <>
              <h3
                id="confirm-modal-title"
                className="mb-4 text-center text-lg font-semibold text-highlight"
              >
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
                      <span
                        className={`text-sm ${row.isAmount ? "font-semibold text-foreground" : "text-foreground"}`}
                      >
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
            <>
              {singleButton && (isSuccess || isError) ? (
                <div className="mb-3 flex justify-center">
                  {isSuccess ? (
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  ) : (
                    <AlertCircle className="h-10 w-10 text-red-600" />
                  )}
                </div>
              ) : null}
              {title ? (
                <h3
                  id="confirm-modal-title"
                  className={`mb-2 text-center text-lg font-semibold ${
                    isError ? "text-red-700 dark:text-red-400" : "text-highlight"
                  }`}
                >
                  {title}
                </h3>
              ) : null}
              <p
                id="confirm-modal-desc"
                className={`text-center text-sm leading-relaxed text-muted ${title ? "" : "text-base sm:text-lg text-foreground"}`}
              >
                {message}
              </p>
            </>
          )}
        </div>
        {singleButton ? (
          <div className="flex justify-center px-6 pb-6 pt-2">
            <button
              type="button"
              className={`min-w-[8rem] rounded-xl px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 ${
                isError
                  ? "bg-red-600 hover:bg-red-700"
                  : isSuccess
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-highlight"
              }`}
              onClick={handlePrimary}
            >
              {confirmLabel}
            </button>
          </div>
        ) : (
          <div className="flex gap-3 px-6 pb-6 pt-4">
            <button
              type="button"
              className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted-bg"
              onClick={dismiss}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 ${
                isDanger ? "bg-red-600 hover:bg-red-700" : "bg-highlight"
              }`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
