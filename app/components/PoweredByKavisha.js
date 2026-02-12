"use client";

export default function PoweredByKavisha({ className = "" }) {
  const isStaging =
    typeof window !== "undefined" && window.location.hostname.includes(".staging.");
  const href = isStaging ? "https://kavisha.staging.kavisha.ai" : "https://kavisha.ai";
  const label = isStaging ? "kavisha.staging.kavisha.ai" : "kavisha.ai";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`block w-full text-center py-2.5 bg-white text-gray-600 text-sm font-medium cursor-pointer flex-shrink-0 hover:underline ${className}`}
    >
      Powered by {label}
    </a>
  );
}
