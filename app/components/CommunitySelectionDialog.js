"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { X } from "lucide-react";

const TYPE_OF_CONNECTION = [
  {
    name: "job_seeker",
    title: "Looking for work",
    initialMessage:
      "Hello! Looking for a job? Beautiful! Tell me all about it and we'll see what can be done. :)",
  },
  {
    name: "recruiter",
    title: "Looking at hiring",
    initialMessage:
      "Hello! Looking at hiring somebody? Beautiful! Tell me all about it and we'll see what can be done. :)",
  },
  {
    name: "friends",
    title: "Looking for a friend",
    initialMessage:
      "Hello! Looking to connect with a friend? Beautiful! Tell me all about it and we'll see what can be done. :)",
  },
];

export default function CommunitySelectionDialog({ isOpen, onClose }) {
  const router = useRouter();
  const { user } = useFirebaseSession();
  const brandContext = useBrandContext();
  const [creating, setCreating] = useState(null);
  const [error, setError] = useState("");

  const handleSelect = async (item) => {
    if (!user?.id || !brandContext?.subdomain) {
      setError("Session or brand not available.");
      return;
    }

    const services = brandContext?.services || [];
    const service = services.find((s) => s.name === item.name);
    const serviceKey = service?._key ?? services[0]?._key;
    if (!serviceKey) {
      setError("No community service available for this brand.");
      return;
    }

    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/newchatsession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: item.name,
          brand: brandContext.subdomain,
          initialmessage: item.initialMessage,
          isCommunityChat: true,
          chatName: item.title,
          serviceKey,
        }),
      });
      const data = await res.json();
      if (data?.success && data?.sessionId) {
        onClose?.();
        router.push(`/community/${data.sessionId}`);
      } else {
        setError(data?.error || "Failed to create session.");
      }
    } catch (e) {
      console.error("Error creating community session:", e);
      setError("Failed to create session.");
    } finally {
      setCreating(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 mb-1 pr-8">
          Why do you want to connect with the community?
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Choose one option to start a new community chat.
        </p>
        {error && (
          <p className="text-sm text-red-600 mb-4 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {TYPE_OF_CONNECTION.map((item) => {
            const isThisCreating = creating === item.name;
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => handleSelect(item)}
                disabled={!!creating}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors font-akshar uppercase text-sm font-light disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isThisCreating ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
                    Starting…
                  </span>
                ) : (
                  item.title
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
