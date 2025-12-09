import { X, FileText } from "lucide-react";

export default function AdminLogsModal({
  selectedSessionLogs,
  setShowLogsModal,
  setSelectedSessionLogs,
  loadingLogs,
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-3 sm:p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0">
              {(selectedSessionLogs.user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                Chat Logs
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                {selectedSessionLogs.user?.name || "Unknown User"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowLogsModal(false);
              setSelectedSessionLogs(null);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0 ml-2"
            aria-label="Close Logs"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-gray-50">
          {loadingLogs ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <div className="text-gray-600 font-medium">
                  Loading chat logs...
                </div>
              </div>
            </div>
          ) : selectedSessionLogs.logs &&
            selectedSessionLogs.logs.length > 0 ? (
            <div className="space-y-4">
              {selectedSessionLogs.logs.map((log, index) => (
                <div
                  key={log._id || index}
                  className={`flex ${
                    log.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[90%] sm:max-w-[85%] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm ${
                      log.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-800 border border-gray-200"
                    }`}
                  >
                    <div className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {log.message}
                    </div>
                    <div
                      className={`text-[10px] sm:text-xs mt-1.5 sm:mt-2 ${
                        log.role === "user" ? "text-blue-100" : "text-gray-500"
                      }`}
                    >
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                No chat logs available
              </h4>
              <p className="text-gray-500">
                This session doesn't have any chat logs yet.
              </p>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 bg-white border-t border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 text-xs sm:text-sm text-gray-600">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <span className="font-medium">
              Total Messages: {selectedSessionLogs.logs?.length || 0}
            </span>
            <span className="text-gray-400 hidden sm:inline">•</span>
            <span className="text-[10px] sm:text-sm truncate max-w-[200px] sm:max-w-none">
              Session: {selectedSessionLogs._id}
            </span>
          </div>
          <div className="text-[10px] sm:text-xs text-gray-400">
            {selectedSessionLogs.logs?.length > 0 &&
              `Last message: ${new Date(selectedSessionLogs.logs[selectedSessionLogs.logs.length - 1]?.createdAt).toLocaleString()}`}
          </div>
        </div>
      </div>
    </div>
  );
}
