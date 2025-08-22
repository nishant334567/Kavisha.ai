"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SetRole() {
  const { data: session } = useSession();
  const [role, setRole] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!session?.user) {
      router.push("/login");
    }
  }, [session]);

  const handleChange = (e) => {
    setRole(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    const response = await fetch("/api/set-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await response.json();
    if (data?.success) {
      window.location.href = "/";
    } else {
      setIsUpdating(false);
      alert("Failed to set the role");
    }
  };

  const roleOptions = [
    {
      value: "job_seeker",
      label: "Job Seeker",
      icon: "💼",
      description: "Looking for job opportunities",
      category: "Professional",
    },
    {
      value: "recruiter",
      label: "Recruiter",
      icon: "🔍",
      description: "Hiring talent for companies",
      category: "Professional",
    },
    {
      value: "male",
      label: "Male",
      icon: "👨",
      description: "Looking for dating connections",
      category: "Dating",
    },
    {
      value: "female",
      label: "Female",
      icon: "👩",
      description: "Looking for dating connections",
      category: "Dating",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Choose Your Role
          </h1>
          <p className="text-slate-600 text-lg">
            Tell us who you are to get started
          </p>
        </div>

        {/* Role Selection Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roleOptions.map((option) => (
              <div key={option.value} className="relative">
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  id={option.value}
                  checked={role === option.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                <label
                  htmlFor={option.value}
                  className={`block cursor-pointer p-6 rounded-xl border-2 transition-all duration-200 ${
                    role === option.value
                      ? "border-orange-500 bg-orange-50 shadow-lg shadow-orange-100"
                      : "border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-25"
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="text-3xl">{option.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-slate-800 text-lg">
                          {option.label}
                        </h3>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            role === option.value
                              ? "border-orange-500 bg-orange-500"
                              : "border-slate-300"
                          }`}
                        >
                          {role === option.value && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-600 text-sm mb-2">
                        {option.description}
                      </p>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          option.category === "Professional"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-pink-100 text-pink-700"
                        }`}
                      >
                        {option.category}
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>

          {/* Continue Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={!role || isUpdating}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
                role && !isUpdating
                  ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300 transform hover:-translate-y-0.5"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {isUpdating ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Setting up...</span>
                </div>
              ) : (
                "Continue"
              )}
            </button>
          </div>
        </form>

        {/* Footer Note */}
        {/* <div className="text-center mt-8">
          <p className="text-slate-500 text-sm">
            You can change your role later in your profile settings
          </p>
        </div> */}
      </div>
    </div>
  );
}
