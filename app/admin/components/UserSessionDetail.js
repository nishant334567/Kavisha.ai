import { Info } from "lucide-react";

export default function UserSessionDetail({
  currentUserSession,
  expandSummaries,
  setExpandedSummaries,
}) {
  return (
    <>
      <div className="mb-4 rounded-lg border border-border bg-card p-3 text-foreground sm:p-4">
        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground sm:mb-3 sm:text-sm">
          <Info className="h-3.5 w-3.5 text-muted sm:h-4 sm:w-4" />
          Session Details
        </h4>
        {/* Title */}
        {currentUserSession.title && (
          <div className="my-2 text-xs text-muted sm:text-sm">
            <span className="font-bold text-foreground">Title:</span>{" "}
            {currentUserSession.title}
          </div>
        )}

        {/* Summary */}
        {currentUserSession.chatSummary && (
          <div className="my-2 text-xs text-muted sm:text-sm">
            <span className="font-bold text-foreground">Chat Summary:</span>{" "}
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
                className="ml-1 text-highlight hover:underline"
              >
                {expandSummaries[currentUserSession._id] ? "less" : "more"}
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
          <div>
            <span className="text-muted">Status:</span>
            <span
              className={`ml-1 font-medium ${
                currentUserSession.status === "completed"
                  ? "text-green-600"
                  : currentUserSession.status === "in-progress"
                    ? "text-highlight"
                    : currentUserSession.status === "on hold"
                      ? "text-yellow-600"
                      : currentUserSession.status === "rejected"
                        ? "text-red-600"
                        : "text-muted"
              }`}
            >
              {currentUserSession.status || "Unknown"}
            </span>
          </div>

          <div>
            <span className="text-muted">Data:</span>
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
            <span className="text-muted">Brand:</span>
            <span className="ml-1 font-medium text-foreground">
              {currentUserSession.brand || "Unknown"}
            </span>
          </div>
          <div>
            <span className="text-muted">Created:</span>
            <span className="ml-1 font-medium text-foreground">
              {new Date(currentUserSession.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-muted">Input Tokens:</span>
            <span className="ml-1 font-medium text-foreground">
              {currentUserSession.totalInputTokens || 0}
            </span>
          </div>
          <div>
            <span className="text-muted">Output Tokens:</span>
            <span className="ml-1 font-medium text-foreground">
              {currentUserSession.totalOutputTokens || 0}
            </span>
          </div>
          <div>
            <span className="text-muted">Total Cost:</span>
            <span className="ml-1 font-medium text-green-600">
              ₹{(currentUserSession.totalCost || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
