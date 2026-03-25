"use client";

export default function QuestionCard({
  question,
  index,
  userAnswers,
  onAnswerChange,
  isCompleted = false,
  questionResult = null,
  getOptionText,
}) {
  const isOptionSelected = (optionId) => {
    const answer = userAnswers.find((ans) => ans.questionId === question.id);
    return answer ? answer.selectedAnswers.includes(optionId) : false;
  };

  const handleChange = (optionId) => {
    if (!isCompleted && onAnswerChange) {
      onAnswerChange(question.id, optionId, question.questionType);
    }
  };

  return (
    <div
      className={`mb-4 rounded-lg border border-border bg-card p-4 text-foreground transition-all sm:mb-6 sm:rounded-xl sm:p-6 ${questionResult
          ? questionResult.isCorrect
            ? "border-green-400 bg-green-50/50"
            : "border-red-400 bg-red-50/50"
          : ""
        }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
              Question {index + 1}
            </span>
            {questionResult && (
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${questionResult.isCorrect
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                  }`}
              >
                {questionResult.isCorrect ? "✓ Correct" : "✗ Incorrect"}
              </span>
            )}
          </div>
          <p className="text-sm font-medium leading-relaxed text-foreground sm:text-base">
            {question?.questionText}
          </p>
          {/* Question Images */}
          {question?.images && question.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {question.images.map((imageUrl, imgIndex) => (
                <img
                  key={imgIndex}
                  src={imageUrl}
                  alt={`Question ${index + 1} image ${imgIndex + 1}`}
                  className="max-h-48 w-auto rounded-lg border border-border bg-card object-contain"
                />
              ))}
            </div>
          )}
        </div>
        {question?.maxMarks && (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-pink-100 text-pink-700 whitespace-nowrap ml-2">
            {question.maxMarks} Mark{question.maxMarks !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {question?.options?.map((option, optIndex) => (
          <label
            key={optIndex}
            className={`flex items-center gap-3 cursor-pointer ${isCompleted ? "cursor-default" : ""
              }`}
          >
            <input
              type={
                question?.questionType === "single_choice"
                  ? "radio"
                  : "checkbox"
              }
              name={`question-${question.id}`}
              value={option?.id}
              checked={isOptionSelected(option.id)}
              onChange={() => handleChange(option.id)}
              disabled={isCompleted}
              className={`h-4 w-4 border-border text-highlight focus:ring-2 focus:ring-ring/30 focus:ring-offset-1 ${isCompleted ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                }`}
            />
            <span
              className={`text-sm ${isCompleted ? "text-muted" : "text-foreground"
                }`}
            >
              {option?.text}
            </span>
          </label>
        ))}
      </div>

      {questionResult && (
        <div className="mt-4 space-y-1.5 border-t border-border pt-3 text-xs sm:mt-5 sm:space-y-2 sm:pt-4 sm:text-sm">
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
            <span className="font-semibold text-foreground sm:min-w-[100px]">
              Your Answer:
            </span>
            <span className="break-words text-muted">
              {questionResult.userAnswer.length > 0
                ? questionResult.userAnswer.map(getOptionText).join(", ")
                : "Not answered"}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
            <span className="font-semibold text-foreground sm:min-w-[100px]">
              Correct Answer:
            </span>
            <span className="text-green-700 font-medium break-words">
              {questionResult.correctAnswer.map(getOptionText).join(", ")}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
            <span className="font-semibold text-foreground sm:min-w-[100px]">
              Marks:
            </span>
            <span className="text-muted">
              {questionResult.marksObtained} / {questionResult.maxMarks}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
