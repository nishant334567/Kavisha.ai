"use client";

import { useState } from "react";
import { X, Send } from "lucide-react";
import EmailEditor from "./EmailEditor";

export default function EmailModal({ onClose, toEmails = [], brand }) {
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [sending, setSending] = useState(false);
  const emails = Array.isArray(toEmails) ? toEmails.filter((e) => e && String(e).trim()) : [];

  const handleSend = async () => {
    if (!emails.length || !subject.trim() || !htmlContent.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/send-bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: emails.map((email) => ({ email, name: email })),
          subject: subject.trim(),
          body: htmlContent.trim(),
          brand: brand || "kavisha",
        }),
      });
      const data = await res.json();
      if (data.success) onClose();
      else alert(data.error || "Failed to send");
    } catch (e) {
      alert("Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold">Send Email</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {emails.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <p className="text-sm text-gray-600 break-all">{emails.join(", ")}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              placeholder="Enter email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
            <EmailEditor value={htmlContent} onChange={setHtmlContent} brand={brand} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !emails.length || !subject.trim() || !htmlContent.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#004A4E] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>

        {emailResults && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Email Results:</h4>
            <p className="text-sm text-gray-600 mb-2">{emailResults.message}</p>
            {emailResults.results && (
              <div className="text-sm">
                <p>Total: {emailResults.results.total}</p>
                <p className="text-green-600">
                  Successful: {emailResults.results.successful}
                </p>
                <p className="text-red-600">Failed: {emailResults.results.failed}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
