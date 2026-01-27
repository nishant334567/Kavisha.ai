"use client";
import FormatText from "@/app/components/FormatText";
import { X, FileText } from "lucide-react";

export default function AdminLogsModal({
  selectedSessionLogs,
  setShowLogsModal,
  setSelectedSessionLogs,
  //   loadingLogs,
}) {
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const formatFooterDate = (dateString) => {
    const date = new Date(dateString);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${date.getDate()} ${months[date.getMonth()]}. ${date.getFullYear()}, ${formatTime(dateString)}`;
  };

  const getFirstMessageDate = () => {
    if (selectedSessionLogs.logs && selectedSessionLogs.logs.length > 0) {
      return formatDate(selectedSessionLogs.logs[0].createdAt);
    }
    return null;
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowLogsModal(false);
          setSelectedSessionLogs(null);
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-3 sm:p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0">
              {(selectedSessionLogs.user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base sm:text-lg font-medium text-gray-900 truncate">
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

        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-blue-50">
          {1 === 2 ? (
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
              {/* Date header */}
              {getFirstMessageDate() && (
                <div className="text-center text-sm text-gray-600 mb-4">
                  {getFirstMessageDate()}
                </div>
              )}
              {selectedSessionLogs.logs.map((log, index) => (
                <div
                  key={log._id || index}
                  className={`flex ${log.role === "user" ? "justify-start" : "justify-end"
                    }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${log.role === "user"
                        ? "bg-white text-gray-800"
                        : "bg-blue-200 text-gray-800 border border-blue-300"
                      }`}
                  >
                    <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      <FormatText text={log?.message} />
                    </div>
                    <div className="text-xs mt-2 text-gray-500">
                      {formatTime(log.createdAt)}
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
          <div>
            <span>Total messages: {selectedSessionLogs.logs?.length || 0}</span>
          </div>
          <div className="text-xs text-gray-500">
            {selectedSessionLogs.logs?.length > 0 &&
              `Last message: ${formatFooterDate(selectedSessionLogs.logs[selectedSessionLogs.logs.length - 1]?.createdAt)}`}
          </div>
        </div>
      </div>
    </div>
  );
}
