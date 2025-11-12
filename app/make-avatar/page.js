"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const fields = [
  {
    id: "subdomain",
    label: "Subdomain Name",
    type: "text",
    placeholder: "e.g., mybrand",
    hint: "Unique subdomain identifier",
  },
  {
    id: "name",
    label: "Name of the Person",
    type: "text",
    placeholder: "e.g., John Doe",
    hint: "Person this AI avatar represents",
  },
  {
    id: "personality",
    label: "Personality",
    type: "textarea",
    placeholder: "e.g., Friendly, professional, helpful...",
    hint: "Personality traits and characteristics",
  },
];

export default function MakeAvatarPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    subdomain: "",
    name: "",
    personality: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const missing = Object.entries(formData).find(([_, v]) => !v.trim());
    if (missing) {
      setError(`${missing[0]} is required`);
      return;
    }
    setLoading(true);
    try {
      alert("AI Avatar created successfully!");
      router.push("/");
    } catch (err) {
      setError(err.message || "Failed to create AI Avatar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Make My AI Avatar
        </h1>
        <p className="text-gray-600 text-sm sm:text-base mb-6">
          Create your personalized AI avatar
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {fields.map(({ id, label, type, placeholder, hint }) => (
            <div key={id}>
              <label
                htmlFor={id}
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {label} <span className="text-red-500">*</span>
              </label>
              {type === "textarea" ? (
                <textarea
                  id={id}
                  name={id}
                  value={formData[id]}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, [id]: e.target.value }))
                  }
                  placeholder={placeholder}
                  rows={6}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base resize-none"
                  required
                  disabled={loading}
                />
              ) : (
                <input
                  type={type}
                  id={id}
                  name={id}
                  value={formData[id]}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, [id]: e.target.value }))
                  }
                  placeholder={placeholder}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base"
                  required
                  disabled={loading}
                />
              )}
              <p className="mt-1 text-xs text-gray-500">{hint}</p>
            </div>
          ))}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                "Create AI Avatar"
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              disabled={loading}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
