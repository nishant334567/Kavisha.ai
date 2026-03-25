"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

export default function AssignApplicationModal({
  applicationId,
  jobId,
  brand,
  currentAssignedTo,
  onClose,
  onSuccess,
}) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchAdmins = useCallback(async () => {
    if (!brand) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/add-admin?brand=${encodeURIComponent(brand)}`,
        { credentials: "include" }
      );
      const data = await res.json();
      setAdmins(Array.isArray(data.admins) ? data.admins : []);
      const current = Array.isArray(currentAssignedTo)
        ? currentAssignedTo
        : currentAssignedTo
          ? [currentAssignedTo]
          : [];
      setSelectedEmails(current.filter((e) => typeof e === "string" && e.trim()));
    } catch {
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, [brand, currentAssignedTo]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const toggleAdmin = (email) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleSubmit = async () => {
    if (!applicationId || !jobId || !brand || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/jobs/${jobId}/applications/${applicationId}?brand=${encodeURIComponent(brand)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignedTo: selectedEmails }),
          credentials: "include",
        }
      );
      const data = await res.json();
      if (data.success && data.application) {
        onSuccess?.(data.application);
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-semibold text-highlight">Assign to admin</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-muted-bg hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Admins (select multiple)
            </label>
            {loading ? (
              <p className="text-sm text-muted">Loading admins...</p>
            ) : admins.length === 0 ? (
              <p className="text-sm text-muted">No admins found.</p>
            ) : (
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-muted-bg p-2">
                {admins.map((email) => (
                  <label
                    key={email}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-card"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmails.includes(email)}
                      onChange={() => toggleAdmin(email)}
                      className="rounded border-border text-highlight focus:ring-highlight"
                    />
                    <span className="text-sm text-foreground">{email}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-2 rounded-lg bg-[#004A4E] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}
