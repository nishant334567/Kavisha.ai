"use client";
export default function AssessmentDetailsForm({
  assessmentData,
  onChange,
  onNext,
  onCancel,
  onSaveDraft
}) {
  const inputClass =
    "w-full rounded-xl border border-border bg-input px-4 py-2 text-foreground font-baloo focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30";

  return (
    <div className="rounded-xl border border-border bg-card p-8 text-foreground shadow-lg">
      <h2 className="mb-6 text-2xl font-semibold text-highlight font-baloo">
        Quiz/Survey Details
      </h2>

      <div className="space-y-6">
        {/* Type */}
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground font-baloo">
            Type <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            {["quiz", "survey"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onChange("type", type)}
                className={`flex-1 py-2.5 rounded-full font-medium text-xs transition-all font-baloo ${assessmentData.type === type
                  ? "bg-[#264653] text-white shadow-md"
                  : "bg-muted-bg text-foreground hover:bg-background"
                  }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground font-baloo">
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
              <label className="mb-2 block text-sm font-medium text-foreground font-baloo">
                Legend / Response Scale
              </label>
              <textarea
                value={assessmentData.legend || ""}
                onChange={(e) => onChange("legend", e.target.value)}
                className={inputClass}
                rows={4}
                placeholder="e.g., 1: Completely Disagree, 2: Moderately Disagree, 3: Slightly Disagree, 4: Neutral, 5: Slightly Agree, 6: Moderately Agree, 7: Completely Agree"
              />
              <p className="mt-1 text-xs text-muted font-baloo">
                Describe the response scale or legend for your survey
              </p>
            </div>

            {/* Scoring Info */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground font-baloo">
                Scoring Instructions
              </label>
              <textarea
                value={assessmentData.scoringInfo || ""}
                onChange={(e) => onChange("scoringInfo", e.target.value)}
                className={inputClass}
                rows={6}
                placeholder="e.g., Add up your scores for items 1, 2, 4 and 5. Reverse your scores for items 3 and 6..."
              />
              <p className="mt-1 text-xs text-muted font-baloo">
                Provide step-by-step instructions on how to calculate the survey
                score
              </p>
            </div>

            {/* Trends */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground font-baloo">
                Trends / Interpretation Guide
              </label>
              <textarea
                value={assessmentData.trends || ""}
                onChange={(e) => onChange("trends", e.target.value)}
                className={inputClass}
                rows={6}
                placeholder="e.g., If you scored 35 or below, you are in bottom 1/4th of people who took the survey..."
              />
              <p className="mt-1 text-xs text-muted font-baloo">
                Provide interpretation guidelines based on score ranges
              </p>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4">
          {onCancel && (
            <button
              onClick={onCancel}
              className="rounded-full border border-border px-6 py-3 font-medium text-foreground transition-colors hover:bg-muted-bg font-baloo"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onNext}
            className={`rounded-full bg-highlight px-6 py-3 font-medium text-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring/30 font-baloo ${onCancel ? "ml-auto" : ""}`}
          >
            Next: Add Questions
          </button>
          {onSaveDraft && typeof onSaveDraft === "function" && (
            <button
              type="button"
              onClick={onSaveDraft}
              className="rounded-full border border-border px-6 py-3 font-medium text-foreground transition-colors hover:bg-muted-bg font-baloo"
            >
              Save as draft
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
