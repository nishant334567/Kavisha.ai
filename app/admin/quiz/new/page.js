// creates new quiz and survey
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import StepIndicator from "@/app/admin/components/StepIndicator";
import AssessmentDetailsForm from "@/app/admin/components/AssessmentDetailsForm";
import QuestionsForm from "@/app/admin/components/QuestionsForm";

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
    console.log("Adding the quiz");
    try {
      const response = await fetch("/api/admin/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment: assessmentData,
          questions: questions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to create quiz/survey");
        return;
      }

      alert("Quiz/Survey created successfully!");
      // Redirect to admin dashboard
      router.push(`/admin/${brandContext.subdomain}/v2`);
    } catch (error) {
      console.error("Error creating assessment:", error);
      alert("An error occurred while creating the quiz/survey");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-6">
        <StepIndicator steps={steps} currentStep={currentStep} />

        {currentStep === 1 && (
          <AssessmentDetailsForm
            assessmentData={assessmentData}
            onChange={handleAssessmentChange}
            onNext={handleNext}
          />
        )}

        {currentStep === 2 && (
          <QuestionsForm
            questions={questions}
            onChange={handleQuestionsChange}
            onBack={handleBack}
            onSubmit={handleSubmit}
            isQuiz={assessmentData.type === "quiz"}
          />
        )}
      </div>
    </div>
  );
}
