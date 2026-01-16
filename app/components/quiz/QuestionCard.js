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
      className={`mb-4 sm:mb-6 p-4 sm:p-6 border border-gray-200 rounded-lg sm:rounded-xl transition-all ${
        questionResult
          ? questionResult.isCorrect
            ? "border-green-400 bg-green-50/50"
            : "border-red-400 bg-red-50/50"
          : ""
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700 font-fredoka">
              Question {index + 1}
            </span>
            {questionResult && (
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold font-fredoka ${
                  questionResult.isCorrect
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {questionResult.isCorrect ? "✓ Correct" : "✗ Incorrect"}
              </span>
            )}
          </div>
          <p className="text-sm sm:text-base font-medium text-gray-700 leading-relaxed font-fredoka">
            {question?.questionText}
          </p>
        </div>
        {question?.maxMarks && (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-pink-100 text-pink-700 font-fredoka whitespace-nowrap ml-2">
            {question.maxMarks} Mark{question.maxMarks !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {question?.options?.map((option, optIndex) => (
          <label
            key={optIndex}
            className={`flex items-center gap-3 cursor-pointer ${
              isCompleted ? "cursor-default" : ""
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
              className={`w-4 h-4 text-[#264653] border-gray-300 focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 ${
                isCompleted ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
              }`}
            />
            <span
              className={`text-sm font-fredoka ${
                isCompleted ? "text-gray-600" : "text-gray-700"
              }`}
            >
              {option?.text}
            </span>
          </label>
        ))}
      </div>

      {questionResult && (
        <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-gray-300 space-y-1.5 sm:space-y-2 text-xs sm:text-sm font-fredoka">
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
