"use client";

import { useState } from "react";

const placeholderText = `You are Nithin Kamath, the co-founder of Zerodha, India's pioneering broking platform, and Rainmatter, a startup investment fund.

Your voice is energetic, candid, and down-to-earth. You explain things with simplicity, persistence, and honesty, always weaving in stories from your entrepreneurial journey. You are not a flashy visionary — you are a grounded builder who believes in persistence, customer insight, and frugality. 

VOICE & STYLE:
- Very short replies: crisp, punchy, direct. But drawing from personal stories and experiences. 
- Never summarise what the user has said. 
- Speak with clarity, energy, and conviction. 

- Inspirational yet practical: persistence, frugality, deep customer insight. 
- Stay humble; credit luck, timing, and your team.
- Ask probing questions to continue the conversation and learn about the person, but not always.

- Never sound robotic; always sound like a mentor-entrepreneur chatting casually. 
`;
export default function CreateAvatar() {
  const [formData, setFormData] = useState({
    subdomain: "",
    brandName: "",
    loginButtonText: "",
    title: "",
    subtitle: "",
    email: "",
    chatbotPersonality: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subdomain.trim()) {
      alert("Subdomain is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/create-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: formData.subdomain.trim(),
          brandName: formData.brandName.trim() || undefined,
          loginButtonText: formData.loginButtonText.trim() || undefined,
          title: formData.title.trim() || undefined,
          subtitle: formData.subtitle.trim() || undefined,
          email: formData.email.trim() || undefined,
          chatbotPersonality: formData.chatbotPersonality.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        window.location.href = "/";
      } else {
        alert(
          "Failed to create avatar. Please try again and refresh the form."
        );
        window.location.reload();
      }
    } catch (err) {
      alert("An error occurred. Please try again and refresh the form.");
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Create AI Avatar
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subdomain <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="subdomain"
              value={formData.subdomain}
              onChange={handleChange}
              placeholder="mybrand"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Your domain will be: {formData.subdomain || "subdomain"}
              .kavisha.ai
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand Name
            </label>
            <input
              type="text"
              name="brandName"
              value={formData.brandName}
              onChange={handleChange}
              placeholder="My Brand"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Login Button Text
            </label>
            <input
              type="text"
              name="loginButtonText"
              value={formData.loginButtonText}
              onChange={handleChange}
              placeholder="Talk to me now"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Welcome to My Brand"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtitle
            </label>
            <textarea
              name="subtitle"
              value={formData.subtitle}
              onChange={handleChange}
              placeholder="Your brand description"
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chatbot Personality
            </label>
            <textarea
              rows={10}
              name="chatbotPersonality"
              value={formData.chatbotPersonality}
              onChange={handleChange}
              placeholder={placeholderText}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Deploying..." : "Deploy Avatar"}
          </button>
        </form>
      </div>
    </div>
  );
}
