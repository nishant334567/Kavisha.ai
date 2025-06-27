"use client";

import { useState } from "react";

export default function ResumeUploader() {
  const [file, setFile] = useState(null);
  const [response, setResponse] = useState(null);

  const handleUpload = async () => {
    if (!file) return alert("Upload an image first!");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload-resume", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setResponse(data.text || data.error);
  };

  return (
    <div className="p-4 border w-fit mx-auto mt-10 space-y-4">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Upload Resume
      </button>
      {response && (
        <div className="mt-4 p-2 bg-gray-100">
          <h4 className="font-bold">Extracted Text:</h4>
          <pre className="text-sm whitespace-pre-wrap">{response}</pre>
        </div>
      )}
    </div>
  );
}
