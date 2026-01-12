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
      className={`mb-4 sm:mb-6 p-4 sm:p-6 border-2 rounded-lg sm:rounded-xl transition-all ${
        questionResult
          ? questionResult.isCorrect
            ? "border-green-400 bg-green-50/50"
            : "border-red-400 bg-red-50/50"
          : "border-gray-200 bg-white hover:border-purple-200"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs sm:text-sm font-semibold text-purple-600">
              Question {index + 1}
            </span>
            {questionResult && (
              <span
                className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-xs font-semibold ${
                  questionResult.isCorrect
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {questionResult.isCorrect ? "✓ Correct" : "✗ Incorrect"}
              </span>
            )}
          </div>
          <p className="text-sm sm:text-base font-medium text-gray-900 leading-relaxed">
            {question?.questionText}
          </p>
        </div>
      </div>

      <div className="space-y-2 sm:space-y-2.5">
        {question?.options?.map((option, optIndex) => (
          <label
            key={optIndex}
            className={`flex items-start sm:items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border transition-all ${
              isCompleted
                ? "border-gray-200 bg-gray-50 cursor-default"
                : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50 cursor-pointer"
            } ${
              isOptionSelected(option.id)
                ? "border-purple-400 bg-purple-50"
                : ""
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
              className={`w-4 h-4 sm:w-5 sm:h-5 mt-0.5 sm:mt-0 text-purple-600 border-gray-300 focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 flex-shrink-0 ${
                isCompleted ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
              }`}
            />
            <span
              className={`flex-1 text-xs sm:text-sm ${
                isCompleted ? "text-gray-600" : "text-gray-700"
              }`}
            >
              {option?.text}
            </span>
          </label>
        ))}
      </div>

      {questionResult && (
        <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-gray-300 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
            <span className="font-semibold text-gray-700 sm:min-w-[100px]">
              Your Answer:
            </span>
            <span className="text-gray-600 break-words">
              {questionResult.userAnswer.length > 0
                ? questionResult.userAnswer.map(getOptionText).join(", ")
                : "Not answered"}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
            <span className="font-semibold text-gray-700 sm:min-w-[100px]">
              Correct Answer:
            </span>
            <span className="text-green-700 font-medium break-words">
              {questionResult.correctAnswer.map(getOptionText).join(", ")}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
            <span className="font-semibold text-gray-700 sm:min-w-[100px]">
              Marks:
            </span>
            <span className="text-gray-600">
              {questionResult.marksObtained} / {questionResult.maxMarks}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
