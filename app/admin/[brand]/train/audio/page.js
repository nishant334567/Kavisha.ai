"use client";

import { useState } from "react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

export default function TrainAudioPage() {
  const [input, setInput] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isUrl, setIsUrl] = useState(false);
  const brandContext = useBrandContext();

  // Function to check if input is a valid URL
  const checkIfUrl = (text) => {
    try {
      const url = new URL(text);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  // Handle input change and auto-detect if it's a URL
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);
    setIsUrl(checkIfUrl(value));
    setError(null);
    setSuccess(null);
    setAudioUrl("");
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setAudioUrl("");

    try {
      if (isUrl) {
        // If it's a URL, make request directly to your working backend API
        const apiUrl = `https://youtube-audio-api-457323016405.us-central1.run.app/extract-audio?url=${encodeURIComponent(input)}`;

        setAudioUrl(apiUrl);
        setSuccess("Audio extracted successfully from YouTube URL!");
      } else {
        // If it's text, process it normally (you can add your text processing logic here)
        setSuccess("Text processing completed!");
      }
    } catch (err) {
      console.error("Error details:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6">Train Audio</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Enter YouTube URL or Text:
              </label>
              <div className="relative">
                <textarea
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Paste a YouTube URL or enter training text..."
                  className="w-full h-32 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {isUrl && (
                  <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                    URL detected
                  </div>
                )}
              </div>
              {isUrl && (
                <p className="text-sm text-blue-600 mt-1">
                  ✓ URL detected - will extract audio from YouTube
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Processing..."
                : isUrl
                  ? "Extract Audio"
                  : "Process Text"}
            </button>
          </form>

          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-600 text-sm">✓ {success}</p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">✗ {error}</p>
            </div>
          )}

          {audioUrl && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-lg font-semibold mb-3">Audio Player</h3>
              <audio
                controls
                className="w-full"
                key={audioUrl} // Force re-render when URL changes
                onError={() =>
                  setError("Failed to load audio. Please try again.")
                }
                preload="metadata"
              >
                <source src={audioUrl} type="audio/mpeg" />
                <source src={audioUrl} type="audio/mp3" />
                <source src={audioUrl} type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
              <div className="mt-2 text-sm text-gray-600">
                <p>
                  Audio extracted from:{" "}
                  <span className="font-mono text-xs break-all">{input}</span>
                </p>
                <p className="mt-1">
                  Audio URL:{" "}
                  <span className="font-mono text-xs break-all">
                    {audioUrl}
                  </span>
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Using direct backend API at localhost:3001
                </p>
                <div className="mt-2">
                  <a
                    href={audioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    🔗 Test Audio URL in New Tab
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
