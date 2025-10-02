"use client";

import { useState, useRef } from "react";

export default function TestPdfPage() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);

  const onPick = (e) => {
    const f = e.target.files?.[0];
    setText("");
    setError("");
    setFile(f || null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setText("");
    if (!file) {
      setError("Please choose a PDF file.");
      return;
    }
    if (file.type !== "application/pdf") {
      setError("Selected file must be a PDF.");
      return;
    }
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("pdf", file);
      const res = await fetch("/api/new-extract-pdf", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      const chunksData = await fetch("/api/embeddings",  {
        method: "POST",
        body: JSON.stringify({
          text: data.text,
        }),
      });
      // const chunks = await chunksData.json();
      // console.log(chunks);
    } catch (err) {
      setError(err.message || "Unexpected error");
    } finally {
      setIsLoading(false);
    }
  };

  const onClear = () => {
    setFile(null);
    setText("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h2 className="text-xl font-semibold mb-4">Test PDF Extraction</h2>
      <form onSubmit={onSubmit} className="grid gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={onPick}
          className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-md bg-gray-900 px-3 py-2 text-white text-sm disabled:opacity-70"
          >
            {isLoading ? "Extracting..." : "Extract Text"}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-md bg-gray-200 px-3 py-2 text-gray-900 text-sm"
          >
            Clear
          </button>
        </div>
      </form>

      {error ? (
        <p className="text-sm text-red-700 mt-3">{error}</p>
      ) : null}

      {text ? (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Extracted Text</h3>
          <textarea
            value={text}
            readOnly
            className="w-full min-h-[360px] p-3 text-sm leading-6 whitespace-pre-wrap font-mono border border-gray-200 rounded-md"
          />
        </div>
      ) : null}
    </div>
  );
}


