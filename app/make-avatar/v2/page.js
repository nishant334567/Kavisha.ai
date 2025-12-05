"use client";

import { useState } from "react";

const stages = {
  BASIC_INFO: 1,
  AI_ANALYSIS: 2,
  REVIEW_SUBMIT: 3,
};

export default function MakeAvatar() {
  const [currentStep, setCurrentStep] = useState(stages.BASIC_INFO);
  const [aboutUser, setAboutUser] = useState({ name: "", bio: "" });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [avatarData, setAvatarData] = useState({
    name: "",
    admin_email: "",
    subdomain: "",
    personality: "",
    knowledge_base: "",
    bio_title: "",
    bio_subtitle: "",
  });
  const [suggestedSubdomains, setSuggestedSubdomains] = useState([]);
  const [suggestedTitles, setSuggestedTitles] = useState([]);
  const [suggestedSubtitles, setSuggestedSubtitles] = useState([]);

  const handleAboutUserChange = (field, value) => {
    setAboutUser((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarDataChange = (field, value) => {
    setAvatarData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep2 = () => {
    if (!avatarData.subdomain?.trim()) {
      alert("Please select a subdomain");
      return false;
    }
    if (!avatarData.admin_email?.trim()) {
      alert("Please enter an admin email");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(avatarData.admin_email.trim())) {
      alert("Please enter a valid email address");
      return false;
    }
    if (!avatarData.personality?.trim()) {
      alert("Please add at least some personality description");
      return false;
    }
    return true;
  };

  const createAvatar = async () => {
    if (!validateStep2() || !avatarData.name?.trim()) {
      if (!avatarData.name?.trim()) {
        alert("Please enter a name for your avatar");
      }
      return;
    }

    setSubmitting(true);
    try {
      let subdomain = avatarData.subdomain.trim().replace(".kavisha.ai", "");
      const chatbotPersonality = [
        avatarData.personality?.trim(),
        avatarData.knowledge_base?.trim(),
      ]
        .filter(Boolean)
        .join("\n\n");

      const response = await fetch("/api/create-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain,
          brandName: avatarData.name.trim(),
          loginButtonText: "Talk to me now",
          title: avatarData.bio_title?.trim() || "",
          subtitle: avatarData.bio_subtitle?.trim() || "",
          email: avatarData.admin_email?.trim() || "",
          chatbotPersonality: chatbotPersonality || "",
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert(
          `Avatar created successfully! Your domain will be available at: ${data.domainName}`
        );
        window.location.href = "/";
      } else {
        alert(
          data.error ||
            data.message ||
            "Failed to create avatar. Please try again."
        );
      }
    } catch (error) {
      alert("An error occurred while creating your avatar. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getFallbackTitles = (name) => [
    `Welcome to ${name}'s AI Avatar`,
    `Chat with ${name}`,
    `${name}'s Digital Twin`,
    `Meet ${name}`,
  ];

  const getFallbackSubtitles = (name) => [
    `Experience conversations with ${name}'s AI personality`,
    `Ask me anything about ${name}`,
    `Powered by AI - ${name}'s knowledge and personality`,
    `Your personal AI assistant based on ${name}`,
  ];

  const createPersonality = async () => {
    if (!aboutUser.name.trim() || !aboutUser.bio.trim()) {
      alert("Please fill in both name and bio");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/suggest-personality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: aboutUser.bio,
          name: aboutUser.name,
        }),
      });

      const data = await response.json();

      if (data.success && data?.fetchedpersonality) {
        const titles = data.titles || [];
        const subtitles = data.subtitles || [];

        setSuggestedSubdomains(data.subdomains || []);
        setSuggestedTitles(titles);
        setSuggestedSubtitles(subtitles);

        setAvatarData({
          name: aboutUser.name,
          admin_email: "",
          subdomain: data.subdomains?.[0] || "",
          personality: data.personality || "",
          knowledge_base: data.knowledge_base || "",
          bio_title: titles[0] || "",
          bio_subtitle: subtitles[0] || "",
        });

        // Move to next step only on success
        setCurrentStep(stages.AI_ANALYSIS);
      } else if (data.success && !data.fetchedpersonality) {
        alert(
          data.message ||
            "We couldn't find enough information. Please fill in the details manually."
        );
        // Still move to next step so user can fill manually
        setCurrentStep(stages.AI_ANALYSIS);
      } else {
        alert(
          data.error ||
            "We couldn't automatically fetch your information. Please continue filling out the form manually to create your avatar."
        );
        // Still move to next step so user can fill manually
        setCurrentStep(stages.AI_ANALYSIS);
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
      // Still move to next step so user can fill manually
      setCurrentStep(stages.AI_ANALYSIS);
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = ({ step, label, isActive, isCompleted }) => (
    <div
      className={`flex-1 flex items-center ${
        isActive || isCompleted ? "text-blue-600" : "text-gray-400"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
          isActive || isCompleted
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-500"
        }`}
      >
        {step}
      </div>
      <span className="ml-3 font-medium hidden sm:block">{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Create Your AI Avatar
          </h1>
          <p className="text-gray-600 text-lg">
            Build a digital twin of yourself powered by AI
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <StepIndicator
              step={1}
              label="Basic Info"
              isActive={currentStep === stages.BASIC_INFO}
              isCompleted={currentStep > stages.BASIC_INFO}
            />
            <div
              className={`flex-1 h-1 mx-2 ${
                currentStep >= stages.AI_ANALYSIS
                  ? "bg-blue-600"
                  : "bg-gray-200"
              }`}
            />
            <StepIndicator
              step={2}
              label="Customize"
              isActive={currentStep === stages.AI_ANALYSIS}
              isCompleted={currentStep > stages.AI_ANALYSIS}
            />
            <div
              className={`flex-1 h-1 mx-2 ${
                currentStep >= stages.REVIEW_SUBMIT
                  ? "bg-blue-600"
                  : "bg-gray-200"
              }`}
            />
            <StepIndicator
              step={3}
              label="Review"
              isActive={currentStep === stages.REVIEW_SUBMIT}
              isCompleted={false}
            />
          </div>
        </div>

        {currentStep === 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Tell us about yourself
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={aboutUser.name}
                  onChange={(e) =>
                    handleAboutUserChange("name", e.target.value)
                  }
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tell us about yourself
                </label>
                <textarea
                  value={aboutUser.bio}
                  onChange={(e) => handleAboutUserChange("bio", e.target.value)}
                  rows={6}
                  placeholder="I am a business analyst at JPMC..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Share your background, expertise, interests, or anything that
                  defines you
                </p>
              </div>
              <button
                onClick={createPersonality}
                disabled={
                  loading || !aboutUser.name.trim() || !aboutUser.bio.trim()
                }
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    Generating suggestions...
                  </span>
                ) : (
                  "Continue"
                )}
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Customize your avatar
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name of Avatar
                </label>
                <input
                  type="text"
                  value={avatarData.name}
                  onChange={(e) =>
                    handleAvatarDataChange("name", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subdomain <span className="text-red-500">*</span>
                </label>
                {suggestedSubdomains.length > 0 ? (
                  <select
                    value={avatarData.subdomain}
                    onChange={(e) =>
                      handleAvatarDataChange("subdomain", e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                  >
                    <option value="">Select a subdomain</option>
                    {suggestedSubdomains.map((item, index) => (
                      <option key={index} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={avatarData.subdomain}
                      onChange={(e) =>
                        handleAvatarDataChange("subdomain", e.target.value)
                      }
                      placeholder="e.g., myname.kavisha.ai or just myname"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Enter your desired subdomain. If you enter just the name
                      (e.g., "myname"), it will become "myname.kavisha.ai"
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personality <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={6}
                  value={avatarData.personality}
                  onChange={(e) =>
                    handleAvatarDataChange("personality", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Personality description..."
                />
                <p className="mt-2 text-sm text-gray-500">
                  How the avatar communicates - tone, style, and speaking
                  patterns
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Knowledge Base
                </label>
                <textarea
                  rows={8}
                  value={avatarData.knowledge_base}
                  onChange={(e) =>
                    handleAvatarDataChange("knowledge_base", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Knowledge base content..."
                />
                <p className="mt-2 text-sm text-gray-500">
                  Core expertise, opinions, and knowledge that the avatar will
                  use in conversations
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={avatarData.admin_email}
                  onChange={(e) =>
                    handleAvatarDataChange("admin_email", e.target.value)
                  }
                  placeholder="admin@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                {suggestedTitles.length > 0 ? (
                  <div className="space-y-2">
                    {suggestedTitles.map((title, index) => (
                      <label
                        key={index}
                        className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          avatarData.bio_title === title
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          id={`title-${index}`}
                          name="bio_title"
                          value={title}
                          checked={avatarData.bio_title === title}
                          onChange={(e) =>
                            handleAvatarDataChange("bio_title", e.target.value)
                          }
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-3 text-gray-700">{title}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={avatarData.bio_title}
                    onChange={(e) =>
                      handleAvatarDataChange("bio_title", e.target.value)
                    }
                    placeholder="Enter a title for your avatar"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subtitle
                </label>
                {suggestedSubtitles.length > 0 ? (
                  <div className="space-y-2">
                    {suggestedSubtitles.map((subtitle, index) => (
                      <label
                        key={index}
                        className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          avatarData.bio_subtitle === subtitle
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          id={`subtitle-${index}`}
                          name="bio_subtitle"
                          value={subtitle}
                          checked={avatarData.bio_subtitle === subtitle}
                          onChange={(e) =>
                            handleAvatarDataChange(
                              "bio_subtitle",
                              e.target.value
                            )
                          }
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 mt-1"
                        />
                        <span className="ml-3 text-gray-700 text-sm">
                          {subtitle}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    rows={3}
                    value={avatarData.bio_subtitle}
                    onChange={(e) =>
                      handleAvatarDataChange("bio_subtitle", e.target.value)
                    }
                    placeholder="Enter a subtitle for your avatar"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                  />
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setCurrentStep(stages.BASIC_INFO)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (validateStep2()) {
                      setCurrentStep(stages.REVIEW_SUBMIT);
                    }
                  }}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                >
                  Review & Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Review Your Avatar
            </h2>
            <p className="text-gray-600 mb-8">
              Please review all information before submitting
            </p>

            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Name of Avatar
                </label>
                <p className="text-gray-900 text-lg">
                  {avatarData.name || "(empty)"}
                </p>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Subdomain
                </label>
                <p className="text-gray-900 text-lg font-mono">
                  {avatarData.subdomain || "(empty)"}
                </p>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Admin Email
                </label>
                <p className="text-gray-900 text-lg">
                  {avatarData.admin_email || "(empty)"}
                </p>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Personality
                </label>
                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {avatarData.personality || "(empty)"}
                </p>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Knowledge Base
                </label>
                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {avatarData.knowledge_base || "(empty)"}
                </p>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Title
                </label>
                <p className="text-gray-900 text-lg">
                  {avatarData.bio_title || "(empty)"}
                </p>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Subtitle
                </label>
                <p className="text-gray-900">
                  {avatarData.bio_subtitle || "(empty)"}
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setCurrentStep(stages.AI_ANALYSIS)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all"
                >
                  Back to Edit
                </button>
                <button
                  onClick={createAvatar}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center">
                      Creating Avatar...
                    </span>
                  ) : (
                    "Submit & Create Avatar"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
