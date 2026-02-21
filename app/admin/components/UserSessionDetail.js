import { Info } from "lucide-react";

export default function UserSessionDetail({
  currentUserSession,
  expandSummaries,
  setExpandedSummaries,
}) {
  return (
    <>
      <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4">
        <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
          Session Details
        </h4>
        {/* Title */}
        {currentUserSession.title && (
          <div className="my-2 text-xs sm:text-sm text-gray-600">
            <span className="font-bold text-gray-700">Title:</span>{" "}
            {currentUserSession.title}
          </div>
        )}

        {/* Summary */}
        {currentUserSession.chatSummary && (
          <div className="my-2 text-xs sm:text-sm text-gray-600">
            <span className="font-bold text-gray-700">Chat Summary:</span>{" "}
            <span
              className={
                !expandSummaries[currentUserSession._id] ? "line-clamp-2" : ""
              }
            >
              {currentUserSession.chatSummary}
            </span>
            {currentUserSession.chatSummary.length > 100 && (
              <button
                onClick={() =>
                  setExpandedSummaries((prev) => ({
                    ...prev,
                    [currentUserSession._id]: !prev[currentUserSession._id],
                  }))
                }
                className="text-[#004A4E] ml-1 hover:underline"
              >
                {expandSummaries[currentUserSession._id] ? "less" : "more"}
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
          <div>
            <span className="text-gray-500">Status:</span>
            <span
              className={`ml-1 font-medium ${
                currentUserSession.status === "completed"
                  ? "text-green-600"
                  : currentUserSession.status === "in-progress"
                    ? "text-[#004A4E]"
                    : currentUserSession.status === "on hold"
                      ? "text-yellow-600"
                      : currentUserSession.status === "rejected"
                        ? "text-red-600"
                        : "text-gray-600"
              }`}
            >
              {currentUserSession.status || "Unknown"}
            </span>
          </div>

          <div>
            <span className="text-gray-500">Data:</span>
            <span
              className={`ml-1 font-medium ${
                currentUserSession.allDataCollected
                  ? "text-green-600"
                  : "text-orange-600"
              }`}
            >
              {currentUserSession.allDataCollected ? "Complete" : "Incomplete"}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Brand:</span>
            <span className="ml-1 font-medium text-gray-900">
              {currentUserSession.brand || "Unknown"}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Created:</span>
            <span className="ml-1 font-medium text-gray-900">
              {new Date(currentUserSession.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Input Tokens:</span>
            <span className="ml-1 font-medium text-gray-900">
              {currentUserSession.totalInputTokens || 0}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Output Tokens:</span>
            <span className="ml-1 font-medium text-gray-900">
              {currentUserSession.totalOutputTokens || 0}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Total Cost:</span>
            <span className="ml-1 font-medium text-green-600">
              ₹{(currentUserSession.totalCost || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
