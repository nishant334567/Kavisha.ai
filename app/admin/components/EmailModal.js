export default function EmailModal({
  recipients = [],
  emailData = { subject: "", body: "" },
  setEmailData,
  onSend,
  sending = false,
  onClose,
  emailResults = null,
}) {
  const count = recipients.length;
  const title =
    count === 0
      ? "Send Email"
      : count === 1
        ? `Send Email to ${recipients[0]?.name || "User"}`
        : `Send Email to ${count} Users`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">{title}</h3>

        {count === 1 && recipients[0]?.email && (
          <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">{recipients[0].email}</p>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) =>
                setEmailData((prev) => ({ ...prev, subject: e.target.value }))
              }
              placeholder="Enter email subject"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message Body</label>
            <textarea
              value={emailData.body}
              onChange={(e) =>
                setEmailData((prev) => ({ ...prev, body: e.target.value }))
              }
              placeholder="Enter your message here..."
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {count > 1 && (
            <div className="text-sm text-gray-600">
              <p>This email will be sent to {count} users:</p>
              <ul className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
                {recipients.map((r, idx) => (
                  <li key={idx} className="flex justify-between py-1 px-2 hover:bg-gray-100 rounded text-left">
                    <span className="truncate flex-1 mr-2">{r.name || "Unknown"}</span>
                    <span className="text-gray-500 truncate max-w-[180px]">{r.email}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
          <button
            onClick={onSend}
            disabled={
              sending ||
              !emailData.subject?.trim() ||
              !emailData.body?.trim() ||
              count === 0
            }
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {sending ? "Sending..." : "Send Email"}
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium"
          >
            Cancel
          </button>
        </div>

        {emailResults && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Email Results:</h4>
            <p className="text-sm text-gray-600 mb-2">{emailResults.message}</p>
            {emailResults.results && (
              <div className="text-sm">
                <p>Total: {emailResults.results.total}</p>
                <p className="text-green-600">
                  Successful: {emailResults.results.successful}
                </p>
                <p className="text-red-600">Failed: {emailResults.results.failed}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
