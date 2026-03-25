"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function UnsubscribePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [brandName, setBrandName] = useState(null);
  const [error, setError] = useState(null);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Missing link. Please use the link from your email.");
      return;
    }
    fetch(`/api/unsubscribe/resolve?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setBrandName(data.brandName || data.brand || "this brand");
      })
      .catch(() => setError("Could not load. Please try the link from your email."));
  }, [token]);

  const handleCancel = () => router.back();

  const handleUnsubscribe = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) setDone(true);
      else setError(data.error || "Failed to unsubscribe");
    } catch {
      setError("Failed to unsubscribe");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-lg">
          <p className="font-medium text-highlight">You have been unsubscribed.</p>
          <p className="mt-1 text-sm text-muted">
            {brandName ? `You will not receive more emails from ${brandName}.` : "You will not receive more emails."}
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 text-sm text-muted hover:text-foreground hover:underline"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-lg">
          <p className="text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 text-sm text-muted hover:text-foreground hover:underline"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  if (brandName === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center text-muted shadow-lg">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <h1 className="mb-2 text-xl font-semibold text-foreground">Unsubscribe</h1>
        <p className="mb-6 text-sm text-muted">
          You will no longer receive emails from <strong>{brandName}</strong>.
        </p>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-foreground">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional feedback"
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted-bg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUnsubscribe}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-[#004A4E] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "…" : "Unsubscribe"}
          </button>
        </div>
      </div>
    </div>
  );
}
