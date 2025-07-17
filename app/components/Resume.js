"use client";
import { useState } from "react";
import shortenFileName from "../utils/shortenfilename";
import { useSession } from "next-auth/react";

export default function Resume({
  resumeData,
  updateResume,
  currentChatId,
  onResumeUpload,
}) {
  const [resume, setResume] = useState(null);
  const [uploadloading, setUploadloading] = useState(false);
  const [isDeleting, setIsdeleting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const { data: session } = useSession();
  // const [resumeSessionData, setResumeSessionData] = useState(resumeData)
  const { filename = "", resumeSummary = "" } = resumeData || {};

  const handleUpload = async (e) => {
    setUploadloading(true);
    e.preventDefault();
    const formData = new FormData();
    if (resume) {
      alert(`Selected file: ${resume.name}`);
      formData.append("file", resume);
      formData.append("sessionId", currentChatId);
      const response = await fetch("/api/doc-to-text", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      let extractedText;
      if (data.text) {
        extractedText = data.text;
        alert("Resume processed. Will consider it in your job search journey!");
        updateResume(resume.name, extractedText);
        onResumeUpload(extractedText);
      } else {
        extractedText = "No text extracted";
        alert("No text extracted from you resume, try uploading again.");
      }

      // fetchChats();
      setResume(null);
      setFileInputKey((prev) => prev + 1);
    } else {
      alert(`No resume selected`);
    }
    setUploadloading(false);
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setIsdeleting(true);
    try {
      const response = await fetch("/api/doc-to-text", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: currentChatId }),
      });
      const data = await response.json();
      if (data.success) {
        setResume(null);
        updateResume("", "");
        setFileInputKey((prev) => prev + 1);
      } else {
        alert(data.error || "Failed to delete resume");
      }
    } catch (err) {}
    setIsdeleting(false);
  };
  return (
    <>
      <div className="flex items-center gap-2 py-2">
        {resume && (
          <span className="px-2 py-1 shadow-md rounded-lg text-xs text-gray-600">
            {shortenFileName(resume.name)}
          </span>
        )}
        {!resume && resumeSummary !== "" && filename !== "" && (
          <span className="px-2 py-1 shadow-md rounded-lg text-xs truncate max-w-[120px]">
            {shortenFileName(filename)}
          </span>
        )}
        <label className="cursor-pointer text-xs px-2 py-1  shadow-md rounded-lg text-blue-600 hover:underline">
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={(e) => setResume(e.target.files[0])}
            key={fileInputKey + currentChatId}
            className="hidden"
          />
          <span>
            {resume || (filename !== "" && resumeSummary !== "")
              ? "Reselect"
              : session?.user?.profileType === "recruiter"
                ? "Share JD"
                : "Upload Resume"}
          </span>
        </label>
        {resume && (
          <button
            className="text-xs px-2 py-1 shadow-md rounded-lg  bg-gray-500 text-white hover:bg-gray-600 transition disabled:opacity-50"
            disabled={uploadloading}
            onClick={(e) => handleUpload(e)}
          >
            {uploadloading ? "Processing..." : "Submit"}
          </button>
        )}
        {filename && resumeSummary !== "" && (
          <button
            className="text-xs px-2 py-1 shadow-md rounded-lg bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50"
            onClick={(e) => handleDelete(e)}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        )}
      </div>
    </>
  );
}
