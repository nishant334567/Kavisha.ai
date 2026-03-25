"use client";

export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all font-fredoka ${
                  currentStep >= step.number
                    ? "bg-[#264653] text-white"
                    : "bg-muted-bg text-muted"
                }`}
              >
                {step.number}
              </div>
              <p
                className={`mt-2 text-xs font-medium font-fredoka ${
                  currentStep >= step.number
                    ? "text-highlight"
                    : "text-muted"
                }`}
              >
                {step.title}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-2 ${
                  currentStep > step.number
                    ? "bg-[#264653]"
                    : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

