"use client";

/**
 * Step 2 of email flow: list of recipients with checkboxes, "This email will be sent to N users",
 * Cancel and Confirm and send. recipients[] = { email, name?, lastEmail? }.
 */
export default function EmailConfirmRecipients({
  recipients,
  selectedEmails,
  onToggle,
  onSelectAll,
  onCancel,
  onConfirm,
  onPreview,
  sending,
}) {
  const count = selectedEmails.length;
  const allSelected = recipients.length > 0 && count === recipients.length;

  const formatLastEmail = (lastEmail) => {
    if (lastEmail == null) return "—";
    const d = new Date(lastEmail);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-gray-50">
        <p className="text-sm font-medium text-gray-700">
          This email will be sent to {count} user{count !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4 overscroll-contain">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="select-all-recipients"
            checked={allSelected}
            onChange={onSelectAll}
            className="rounded border-gray-300 text-[#004A4E] focus:ring-[#004A4E]"
          />
          <label htmlFor="select-all-recipients" className="text-sm font-medium text-gray-700 cursor-pointer">
            {allSelected ? "Deselect all" : "Select all"}
          </label>
        </div>

        <ul className="divide-y divide-gray-200">
          {recipients.map((r) => {
            const checked = selectedEmails.includes(r.email);
            return (
              <li key={r.email} className="flex items-center gap-3 py-3 first:pt-0">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(r.email)}
                  className="rounded border-gray-300 text-[#004A4E] focus:ring-[#004A4E] shrink-0"
                />
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="min-w-0">
                    <span className="font-semibold text-gray-900 block truncate">{r.name || r.email}</span>
                    <span className="text-sm text-gray-500 truncate block">{r.email}</span>
                  </div>
                  <span className="text-sm text-gray-500 shrink-0">{formatLastEmail(r.lastEmail)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex-shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
        {onPreview && (
          <button
            type="button"
            onClick={onPreview}
            className="px-4 py-2 rounded-lg bg-blue-100 text-blue-800 text-sm font-medium hover:bg-blue-200"
          >
            Preview
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={sending || count === 0}
          className="px-4 py-2 rounded-lg bg-[#004A4E] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? "Sending..." : "Confirm and send"}
        </button>
      </div>
    </div>
  );
}
