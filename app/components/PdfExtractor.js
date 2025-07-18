"use client";

import { useState } from "react";

export default function PdfExtractor() {
  const [file, setFile] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pdfInfo, setPdfInfo] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setError("");
      } else {
        setError("Please select a PDF file");
        setFile(null);
      }
    }
  };

  const extractText = async () => {
    if (!file) {
      setError("Please select a PDF file first");
      return;
    }

    setLoading(true);
    setError("");
    setExtractedText("");

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const response = await fetch("/api/extract-pdf", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setExtractedText(result.text);
        setPdfInfo({
          pages: result.pages,
          info: result.info,
          metadata: result.metadata,
        });
      } else {
        setError(result.error || "Failed to extract text");
      }
    } catch (err) {
      setError("An error occurred while extracting text");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setFile(null);
    setExtractedText("");
    setError("");
    setPdfInfo(null);
    // Reset file input
    const fileInput = document.getElementById("pdf-input");
    if (fileInput) fileInput.value = "";
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      alert("Text copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const downloadText = () => {
    const element = document.createElement("a");
    const file = new Blob([extractedText], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `extracted-text-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            PDF Text Extractor
          </h1>
          <p className="text-gray-600">
            Upload a PDF file and extract its text content
          </p>
        </div>

        <div className="p-6">
          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select PDF File
            </label>
            <input
              id="pdf-input"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)}{" "}
                MB)
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={extractText}
              disabled={!file || loading}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Extracting..." : "Extract Text"}
            </button>

            <button
              onClick={clearResults}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* PDF Info */}
          {pdfInfo && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">
                PDF Information:
              </h3>
              <p className="text-sm text-blue-700">
                Pages: {pdfInfo.pages} | Title: {pdfInfo.info?.Title || "N/A"} |
                Author: {pdfInfo.info?.Author || "N/A"}
              </p>
            </div>
          )}

          {/* Extracted Text */}
          {extractedText && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">
                  Extracted Text ({extractedText.length} characters)
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={copyText}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                  >
                    Copy Text
                  </button>
                  <button
                    onClick={downloadText}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
                  >
                    Download
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-700">
                  {extractedText}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
