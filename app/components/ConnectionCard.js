"use client";
import React from "react";

export default function ConnectionCard({ message, emailSent, createdAt }) {
  return (
    <div className="bg-white border rounded-lg shadow p-4 flex flex-col gap-2 min-h-[100px] w-full">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">{message}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded ${emailSent ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}
        >
          {emailSent && "Email Already Received"}
        </span>
      </div>
      {createdAt && (
        <div className="text-[10px] text-gray-400 mt-1">
          Created: {new Date(createdAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
