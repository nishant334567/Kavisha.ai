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

        {/* Grading Mode (only for quiz) */}
        {assessmentData.type === "quiz" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grading Mode
            </label>
            <select
              value={assessmentData.gradingMode}
              onChange={(e) => onChange("gradingMode", e.target.value)}
              className={inputClass}
            >
              <option value="none">No Grading</option>
              <option value="auto">Auto Grading</option>
              <option value="llm">LLM Grading</option>
            </select>
          </div>
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
