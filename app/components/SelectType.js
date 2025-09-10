"use client";
import { useEffect } from "react";
export default function SelectChatType({
  servicesProvided,
  selectedType,
  selectChatType,
  isCreating,
}) {
  useEffect(() => {}, [servicesProvided]);
  const base =
    "px-5 py-3 text-base sm:text-lg rounded-xl border transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-60 disabled:cursor-not-allowed";
  const cls = (item) =>
    selectedType === item.name
      ? "bg-slate-800 text-white border-slate-800 scale-105"
      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50";

  return (
    <div className="flex h-full items-center justify-center py-6">
      <div className="flex flex-col sm:flex-row gap-4">
        {servicesProvided.length > 0 &&
          servicesProvided.map((item) => (
            <button
              key={item.name}
              onClick={() =>
                !isCreating && selectChatType(item.name, item.initialMessage)
              }
              className={`${base} ${cls(item)}`}
              disabled={isCreating}
            >
              {isCreating && selectedType === item.name ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin"></span>
                  <span>Starting…</span>
                </span>
              ) : (
                <>{item.title}</>
              )}
            </button>
          ))}
      </div>
    </div>
  );
}
