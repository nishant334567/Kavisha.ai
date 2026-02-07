"use client";

export default function PoweredByKavisha({ className = "" }) {
  return (
    <a
      href="https://kavisha.ai"
      target="_blank"
      rel="noopener noreferrer"
      className={`block w-full text-center py-2.5 bg-white text-gray-600 text-sm font-medium cursor-pointer flex-shrink-0 hover:underline ${className}`}
    >
      Powered by kavisha.ai
    </a>
  );
}
