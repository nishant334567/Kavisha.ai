export default function EmailModal({
  selectedSession,
  individualEmailData,
  setIndividualEmailData,
  handleSendIndividualEmail,
  sendingIndividualEmail,
  setShowIndividualEmailModal,
  setSelectedSession,
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">
          Send Email to {selectedSession.user?.name || "User"}
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
          {selectedSession.user?.email}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={individualEmailData.subject}
              onChange={(e) =>
                setIndividualEmailData((prev) => ({
                  ...prev,
                  subject: e.target.value,
                }))
              }
              placeholder="Enter email subject"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Body
            </label>
            <textarea
              value={individualEmailData.body}
              onChange={(e) =>
                setIndividualEmailData((prev) => ({
                  ...prev,
                  body: e.target.value,
                }))
              }
              placeholder="Enter your message here..."
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
          <button
            onClick={handleSendIndividualEmail}
            disabled={
              sendingIndividualEmail ||
              !individualEmailData.subject.trim() ||
              !individualEmailData.body.trim()
            }
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {sendingIndividualEmail ? "Sending..." : "Send Email"}
          </button>
          <button
            onClick={() => {
              setShowIndividualEmailModal(false);
              setIndividualEmailData({ subject: "", body: "" });
              setSelectedSession(null);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
