// creates new quiz and survey
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import StepIndicator from "@/app/admin/components/StepIndicator";
import AssessmentDetailsForm from "@/app/admin/components/AssessmentDetailsForm";
import QuestionsForm from "@/app/admin/components/QuestionsForm";
import { ArrowLeft } from "lucide-react";

export default function AddQuiz() {
  const router = useRouter();
  const brandContext = useBrandContext();
  const [currentStep, setCurrentStep] = useState(1);

  const [assessmentData, setAssessmentData] = useState({
    brand: brandContext?.subdomain || "",
    type: "quiz",
    title: "",
    subtitle: "",
    objective: "",
    instructions: "",
    totalMarks: null,
    durationInMinutes: null,
    legend: "",
    scoringInfo: "",
    trends: "",
  });

  const [questions, setQuestions] = useState([]);

  const steps = [
    { number: 1, title: "Add Quiz/Survey Details" },
    { number: 2, title: "Add Questions" },
  ];

  const handleAssessmentChange = (field, value) => {
    setAssessmentData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    // Validate required fields
    if (!assessmentData.title.trim()) {
      alert("Please enter a title");
      return;
    }
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleQuestionsChange = (updatedQuestions) => {
    setQuestions(updatedQuestions);
  };

  const handleSubmit = async () => {
    // Debug: Log questions with images

    try {
      const response = await fetch("/api/admin/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment: { ...assessmentData, status: "published" },
          questions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to create quiz/survey");
        return;
      }

      alert("Quiz/Survey published!");
      // Redirect to admin dashboard
      router.push(`/admin/${brandContext.subdomain}/v2`);
    } catch (error) {
      console.error("Error creating assessment:", error);
      alert("An error occurred while creating the quiz/survey");
    }
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel? All unsaved changes will be lost.")) {
      router.push("/admin/quiz");
    }
  };


  const saveDraft = async () => {
    try {
      const response = await fetch("/api/admin/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment: { ...assessmentData, status: "draft" },
          questions,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Failed to save draft");
        return;
      }
      alert("Draft saved.");
      router.push("/admin/quiz");
    } catch (err) {
      console.error("Error saving draft:", err);
      alert("Failed to save draft");
    }
  };
  return (
    <div className="min-h-screen bg-white pt-20 md:pt-24 pb-8">
      <div className="max-w-3xl mx-auto px-6">
        {/* Back/Cancel Button */}
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors mb-6 text-sm font-medium font-fredoka group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Cancel
        </button>

        <StepIndicator steps={steps} currentStep={currentStep} />

        {currentStep === 1 && (
          <AssessmentDetailsForm
            assessmentData={assessmentData}
            onChange={handleAssessmentChange}
            onNext={handleNext}
            onCancel={handleCancel}
            onSaveDraft={saveDraft}
          />
        )}

        {currentStep === 2 && (
          <QuestionsForm
            questions={questions}
            onChange={handleQuestionsChange}
            onBack={handleBack}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isQuiz={assessmentData.type === "quiz"}
            brand={assessmentData.brand || brandContext?.subdomain}
            onSaveDraft={saveDraft}
          />
        )}
      </div>
    </div>
  );
}
