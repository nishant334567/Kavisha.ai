"use client";
export default function AssessmentDetailsForm({
  assessmentData,
  onChange,
  onNext,
}) {
  const inputClass =
    "w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent";

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Quiz/Survey Details
      </h2>

      <div className="space-y-6">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            {["quiz", "survey"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onChange("type", type)}
                className={`flex-1 py-2.5 rounded-lg font-medium text-xs transition-all ${
                  assessmentData.type === type
                    ? "bg-purple-900 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={assessmentData.title}
            onChange={(e) => onChange("title", e.target.value)}
            className={inputClass}
            placeholder="Enter quiz/survey title"
          />
        </div>

        {/* Survey-specific fields */}
        {assessmentData.type === "survey" && (
          <>
            {/* Legend */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Legend / Response Scale
              </label>
              <textarea
                value={assessmentData.legend || ""}
                onChange={(e) => onChange("legend", e.target.value)}
                className={inputClass}
                rows={4}
                placeholder="e.g., 1: Completely Disagree, 2: Moderately Disagree, 3: Slightly Disagree, 4: Neutral, 5: Slightly Agree, 6: Moderately Agree, 7: Completely Agree"
              />
              <p className="text-xs text-gray-500 mt-1">
                Describe the response scale or legend for your survey
              </p>
            </div>

            {/* Scoring Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scoring Instructions
              </label>
              <textarea
                value={assessmentData.scoringInfo || ""}
                onChange={(e) => onChange("scoringInfo", e.target.value)}
                className={inputClass}
                rows={6}
                placeholder="e.g., Add up your scores for items 1, 2, 4 and 5. Reverse your scores for items 3 and 6..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Provide step-by-step instructions on how to calculate the survey
                score
              </p>
            </div>

            {/* Trends */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trends / Interpretation Guide
              </label>
              <textarea
                value={assessmentData.trends || ""}
                onChange={(e) => onChange("trends", e.target.value)}
                className={inputClass}
                rows={6}
                placeholder="e.g., If you scored 35 or below, you are in bottom 1/4th of people who took the survey..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Provide interpretation guidelines based on score ranges
              </p>
            </div>
          </>
        )}

        {/* Next Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={onNext}
            className="px-6 py-3 bg-purple-900 text-white rounded-lg font-medium hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Next: Add Questions
          </button>
        </div>
      </div>
    </div>
  );
}
