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
      className={`block w-full flex-shrink-0 cursor-pointer bg-transparent text-center text-xs font-medium text-muted hover:underline ${className}`}
    >
      Powered by {label}
    </a>
  );
}
