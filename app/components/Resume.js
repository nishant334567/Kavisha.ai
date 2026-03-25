"use client";
import { useState } from "react";
import shortenFileName from "../utils/shortenfilename";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { Paperclip } from "lucide-react";

export default function Resume({
  resumeData,
  updateResume,
  currentChatId,
  onResumeUpload,
  hideFileInput = false,
  selectedFile = null,
  setSelectedFile = () => { },
}) {
  // Use selectedFile from props if available, otherwise use local state
  const resume = selectedFile;
  const setResume = setSelectedFile;
  const [uploadloading, setUploadloading] = useState(false);
  const [isDeleting, setIsdeleting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const { user } = useFirebaseSession();
  // const [resumeSessionData, setResumeSessionData] = useState(resumeData)
  const { filename = "", resumeSummary = "" } = resumeData || {};

  const handleUpload = async (e) => {
    setUploadloading(true);
    e.preventDefault();
    const formData = new FormData();
    if (resume) {
      alert(`Selected file: ${resume.name}`);
      formData.append("pdf", resume);
      formData.append("sessionId", currentChatId);
      const response = await fetch("/api/extract-pdf", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      let extractedText;
      if (data.text) {
        extractedText = data.text;
        alert("Document uploaded successfully.");
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
      const response = await fetch("/api/extract-pdf", {
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
    } catch (err) { }
    setIsdeleting(false);
  };
  return (
    <>
      <div className="flex items-center gap-2 py-2">
        {resume && (
          <span className="rounded-lg bg-card px-2 py-1 text-xs text-muted shadow-md">
            {shortenFileName(resume.name)}
          </span>
        )}
        {!resume && resumeSummary !== "" && filename !== "" && (
          <span className="max-w-[120px] truncate rounded-lg bg-card px-2 py-1 text-xs text-foreground shadow-md">
            {shortenFileName(filename)}
          </span>
        )}

        {/* Only show file input if not hidden */}
        {!hideFileInput && (
          <label className="cursor-pointer rounded-lg bg-muted-bg px-2 py-1 text-xs text-highlight shadow-md hover:bg-card hover:underline">
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => setResume(e.target.files[0])}
              key={fileInputKey + currentChatId}
              className="hidden"
            />
            <Paperclip className="w-5 h-5" />
            {resume || (filename !== "" && resumeSummary !== "")
              ? "Reselect"
              : user?.profileType === "recruiter"
                ? "Share JD"
                : "Upload Resume"}
          </label>
        )}

        {resume && (
          <button
            className="rounded-lg bg-highlight px-2 py-1 text-xs text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
            disabled={uploadloading}
            onClick={(e) => handleUpload(e)}
          >
            {uploadloading ? "Processing..." : "Submit"}
          </button>
        )}
        {filename && resumeSummary !== "" && (
          <button
            className="rounded-lg bg-red-500 px-2 py-1 text-xs text-white shadow-md transition hover:bg-red-600 disabled:opacity-50"
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
