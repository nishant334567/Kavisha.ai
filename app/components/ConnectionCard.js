"use client";
import React from "react";

export default function ConnectionCard({ message, emailSent, createdAt }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow p-4 flex flex-col gap-2 min-h-[100px] w-full">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-800 text-sm">{message}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded ${emailSent ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
        >
          {emailSent && "Email Already Received"}
        </span>
      </div>
      {createdAt && (
        <div className="text-[10px] text-slate-500 mt-1">
          Created: {new Date(createdAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
