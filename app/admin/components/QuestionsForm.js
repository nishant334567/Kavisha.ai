"use client";
import { useState } from "react";
import QuestionItem from "./QuestionItem";
import { Plus, CheckCircle2 } from "lucide-react";

export default function QuestionsForm({
  questions,
  onChange,
  onBack,
  onSubmit,
  isQuiz,
  brand,
}) {
  const [addQues, setAddQues] = useState(false);
  const [newQuestionData, setNewQuestionData] = useState({
    images: [],
    questionText: "",
    questionType: "single_choice",
    options: [],
    correctAnswer: null,
    evaluationHint: "",
    maxMarks: 1,
    order: questions.length + 1,
    required: true,
  });

  const updateQuestion = (index, key, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [key]: value };
    onChange(updatedQuestions);
  };

  const addQuestion = () => {
    // Validate question text
    if (!newQuestionData.questionText.trim()) {
      alert("Please enter question text");
      return;
    }

    // Validate options
    if (!newQuestionData.options || newQuestionData.options.length === 0) {
      alert("Please add at least one option");
      return;
    }

    // Validate option texts
    const hasEmptyOptions = newQuestionData.options.some(
      (opt) => !opt.text?.trim()
    );
    if (hasEmptyOptions) {
      alert("All options must have text");
      return;
    }

    // Validate correct answer for quiz
    if (isQuiz) {
      if (
        newQuestionData.correctAnswer === null ||
        (Array.isArray(newQuestionData.correctAnswer) &&
          newQuestionData.correctAnswer.length === 0)
      ) {
        alert("Please select at least one correct answer");
        return;
      }
    }

    // Add question with correct order
    const newQuestion = {
      ...newQuestionData,
      order: questions.length + 1,
    };
    onChange([...questions, newQuestion]);

    // Reset form
    setNewQuestionData({
      images: [],
      questionText: "",
      questionType: "single_choice",
      options: [],
      correctAnswer: null,
      evaluationHint: "",
      maxMarks: 1,
      order: questions.length + 2,
      required: true,
    });

    // Close the form
    setAddQues(false);
  };

  const handleSubmit = () => {
    // Validate at least one question exists
    if (questions.length === 0) {
      alert("Please add at least one question");
      return;
    }

    // Validate all questions
    const hasInvalidQuestions = questions.some((q) => {
      return (
        !q.questionText?.trim() ||
        !q.options ||
        q.options.length === 0 ||
        q.options.some((opt) => !opt.text?.trim())
      );
    });

    if (hasInvalidQuestions) {
      alert(
        "Please ensure all questions have text and at least one valid option"
      );
      return;
    }

    // Validate correct answers for quiz
    if (isQuiz) {
      const hasNoCorrectAnswer = questions.some((q) => {
        return (
          q.correctAnswer === null ||
          (Array.isArray(q.correctAnswer) && q.correctAnswer.length === 0)
        );
      });

      if (hasNoCorrectAnswer) {
        alert("Please select correct answers for all quiz questions");
        return;
      }
    }

    onSubmit();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-[#264653] font-fredoka">Add Questions</h2>
        <button
          type="button"
          onClick={() => {
            setAddQues(!addQues);
            if (addQues) {
              // Reset form when canceling
              setNewQuestionData({
                images: [],
                questionText: "",
                questionType: "single_choice",
                options: [],
                correctAnswer: null,
                evaluationHint: "",
                maxMarks: 1,
                order: questions.length + 1,
                required: true,
              });
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#264653] text-white rounded-full font-medium hover:bg-[#1e383e] transition-colors font-fredoka"
        >
          <Plus className="w-5 h-5" />
          {addQues ? "Cancel" : "Add Question"}
        </button>
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg mb-6">
          <p className="text-gray-500 mb-4 font-fredoka">No questions added yet.</p>
          <button
            type="button"
            onClick={() => setAddQues(true)}
            className="text-[#264653] hover:text-[#1e383e] font-medium font-fredoka"
          >
            Click here to add your first question
          </button>
        </div>
      ) : (
        <div className="mb-6">
          {questions.map((item, index) => (
            <QuestionItem
              key={index}
              question={item}
              index={index}
              onChange={updateQuestion}
              isQuiz={isQuiz}
              brand={brand}
            />
          ))}
        </div>
      )}

      {/* Add Question Form */}
      {addQues && (
        <div className="border-2 border-teal-200 border-dashed rounded-xl p-6 bg-teal-50 mb-6">
          <h3 className="text-lg font-semibold text-[#264653] mb-4 font-fredoka">
            New Question
          </h3>
          <QuestionItem
            question={newQuestionData}
            index={-1}
            onChange={(idx, key, value) => {
              setNewQuestionData((prev) => ({ ...prev, [key]: value }));
            }}
            isQuiz={isQuiz}
            brand={brand}
          />
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={addQuestion}
              className="flex-1 px-4 py-2 bg-[#264653] text-white rounded-full font-medium hover:bg-[#1e383e] transition-colors font-fredoka"
            >
              Save Question
            </button>
            <button
              type="button"
              onClick={() => {
                setAddQues(false);
                setNewQuestionData({
                  images: [],
                  questionText: "",
                  questionType: "single_choice",
                  options: [],
                  correctAnswer: null,
                  evaluationHint: "",
                  maxMarks: 1,
                  order: questions.length + 1,
                  required: true,
                });
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-colors font-fredoka"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      {questions.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-700 font-fredoka">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span>
              <strong>{questions.length}</strong> question
              {questions.length !== 1 ? "s" : ""} added
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-colors font-fredoka"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-3 bg-[#264653] text-white rounded-full font-medium hover:bg-[#1e383e] transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 font-fredoka"
        >
          Submit Quiz/Survey
        </button>
      </div>
    </div>
  );
}
