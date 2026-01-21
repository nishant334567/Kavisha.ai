"use client";
import { useState, useEffect, useRef } from "react";
import { Trash2, Plus, ImagePlus } from "lucide-react";

export default function QuestionItem({ question, index, onChange, isQuiz, brand }) {
  const [localQuestion, setLocalQuestion] = useState(question);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setLocalQuestion(question);
  }, [question]);

  const handleQuestionTextChange = (e) => {
    onChange(index, "questionText", e.target.value);
  };

  const handleQuestionTypeChange = (type) => {
    onChange(index, "questionType", type);
    // Reset correct answer when changing type
    onChange(index, "correctAnswer", type === "single_choice" ? null : []);
  };

  const handleOptionChange = (optIndex, value) => {
    const updatedOptions = [...(localQuestion?.options || [])];
    updatedOptions[optIndex] = {
      ...updatedOptions[optIndex],
      text: value,
    };
    onChange(index, "options", updatedOptions);
  };

  const handleAddOption = () => {
    const updatedOptions = [
      ...(localQuestion?.options || []),
      {
        id: `opt_${Date.now()}_${Math.random()}`,
        text: "",
      },
    ];
    onChange(index, "options", updatedOptions);
  };

  const handleRemoveOption = (optIndex) => {
    const updatedOptions = (localQuestion?.options || []).filter(
      (_, idx) => idx !== optIndex
    );
    onChange(index, "options", updatedOptions);
    // Clear correct answer if it was the removed option
    if (localQuestion.questionType === "single_choice") {
      if (localQuestion.correctAnswer === localQuestion.options[optIndex]?.id) {
        onChange(index, "correctAnswer", null);
      }
    } else {
      const removedId = localQuestion.options[optIndex]?.id;
      if (Array.isArray(localQuestion.correctAnswer)) {
        const updatedAnswers = localQuestion.correctAnswer.filter(
          (id) => id !== removedId
        );
        onChange(index, "correctAnswer", updatedAnswers);
      }
    }
  };

  const handleCorrectAnswerChange = (optionId) => {
    if (localQuestion.questionType === "single_choice") {
      onChange(index, "correctAnswer", optionId);
    } else {
      // multi_choice
      const currentAnswers = Array.isArray(localQuestion.correctAnswer)
        ? localQuestion.correctAnswer
        : [];
      const isSelected = currentAnswers.includes(optionId);
      const updatedAnswers = isSelected
        ? currentAnswers.filter((id) => id !== optionId)
        : [...currentAnswers, optionId];
      onChange(index, "correctAnswer", updatedAnswers);
    }
  };

  const handleMaxMarksChange = (e) => {
    onChange(index, "maxMarks", parseInt(e.target.value) || 1);
  };

  const handleImageChange = async(e) => {
    const files = Array.from(e.target.files || [])
    if(files.length===0) return 
    if (!brand) {
      alert("Image upload requires brand context.");
      e.target.value = "";
      return;
    }
 setUploadingImages(true);
    const urls = [];

    try{
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("brand", brand);
         const res = await fetch("/api/admin/quiz/upload-question-image", { method: "POST", body: fd });
         const data = await res.json();
         if(!res.ok) throw new Error(data.error || "Upload Failed")
          if(data.url) urls.push(data.url)
         
      }
      const existing = localQuestion?.images|| [];
      onChange(index,"images", [...existing,...urls])
    }catch (err) {
      alert(err?.message || "Failed to upload images");
    } finally {
      setUploadingImages(false);
      e.target.value = "";
    }
  };

  const removeImage = (imgIndex) => {
    const arr = (localQuestion?.images || []).filter((_, i) => i !== imgIndex);
    onChange(index, "images", arr);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-[#264653] font-fredoka">
          Question {index + 1}
        </span>
      </div>

      {/* Question Type */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2 font-fredoka">
          Question Type <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleQuestionTypeChange("single_choice")}
            className={`flex-1 py-2 px-4 rounded-full font-medium text-sm transition-all font-fredoka ${
              localQuestion?.questionType === "single_choice"
                ? "bg-[#264653] text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Single Choice
          </button>
          <button
            type="button"
            onClick={() => handleQuestionTypeChange("multi_choice")}
            className={`flex-1 py-2 px-4 rounded-full font-medium text-sm transition-all font-fredoka ${
              localQuestion?.questionType === "multi_choice"
                ? "bg-[#264653] text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Multiple Choice
          </button>
        </div>
      </div>

      {/* Question Text */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2 font-fredoka">
          Question Text <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={3}
          value={localQuestion?.questionText || ""}
          onChange={handleQuestionTextChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none font-fredoka"
          placeholder="Enter your question"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 font-fredoka">
          Question images (optional)
        </label>
        <input ref={fileInputRef} type="file" multiple className="hidden" accept="image/*" onChange={handleImageChange}/>
      <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 text-sm font-fredoka text-[#264653] disabled:opacity-50" type="button" onClick={()=>fileInputRef.current?.click()} disabled={uploadingImages}><ImagePlus className="w-4 h-4" />
          {uploadingImages ? "Uploading…" : "Add images"}</button>
      <div className="flex flex-wrap gap-2 mt-2">
        {(localQuestion?.images || []).map((url, i) => (
          <div key={i} className="relative group">
            <img src={url} alt="" className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:opacity-100 opacity-90 transition-opacity"
              title="Remove"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      </div>

      {/* Options */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 font-fredoka">
            Options <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={handleAddOption}
            className="flex items-center gap-1 text-sm text-[#264653] hover:text-[#1e383e] font-medium font-fredoka"
          >
            <Plus className="w-4 h-4" />
            Add Option
          </button>
        </div>
        <div className="space-y-2">
          {(localQuestion?.options || []).map((item, optIndex) => (
            <div key={item?.id || optIndex} className="flex items-center gap-2">
              {/* Correct Answer Indicator (only for quiz) */}
              {isQuiz && (
                <input
                  type={
                    localQuestion?.questionType === "single_choice"
                      ? "radio"
                      : "checkbox"
                  }
                  name={`correct-${index}`}
                  checked={
                    localQuestion?.questionType === "single_choice"
                      ? localQuestion?.correctAnswer === item?.id
                      : Array.isArray(localQuestion?.correctAnswer) &&
                        localQuestion?.correctAnswer.includes(item?.id)
                  }
                  onChange={() => handleCorrectAnswerChange(item?.id)}
                  className="w-4 h-4 text-[#264653] focus:ring-teal-500 cursor-pointer"
                  title="Mark as correct answer"
                />
              )}
              <input
                type="text"
                value={item?.text || ""}
                onChange={(e) => handleOptionChange(optIndex, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-fredoka"
                placeholder={`Option ${optIndex + 1}`}
              />
              {(localQuestion?.options || []).length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveOption(optIndex)}
                  className="text-red-400 hover:text-red-600 transition-colors p-1"
                  title="Remove option"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {(!localQuestion?.options || localQuestion.options.length === 0) && (
          <p className="text-sm text-gray-500 mt-2 italic font-fredoka">
            No options added. Click "Add Option" to add one.
          </p>
        )}
      </div>

      {/* Max Marks */}
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700 mb-2 font-fredoka">
          Max Marks
        </label>
        <input
          type="number"
          value={localQuestion?.maxMarks || 1}
          onChange={handleMaxMarksChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-fredoka"
          min="1"
        />
      </div>

      {/* Correct Answer Indicator */}
      {isQuiz && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 font-fredoka">
            {localQuestion?.questionType === "single_choice"
              ? "Select one correct answer (radio button)"
              : "Select one or more correct answers (checkboxes)"}
          </p>
        </div>
      )}
    </div>
  );
}
