"use client";

export default function PoweredByKavisha({ className = "", compact = false }) {
  const isStaging =
    typeof window !== "undefined" && window.location.hostname.includes(".staging.");
  const href = isStaging ? "https://kavisha.staging.kavisha.ai" : "https://kavisha.ai";
  const label = isStaging ? "kavisha.staging.kavisha.ai" : "kavisha.ai";

  if (compact) {
    return (
      <p className={`chat-composer-footer ${className}`.trim()}>
        Powered by{" "}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {label}
        </a>
      </p>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`block w-full flex-shrink-0 cursor-pointer border-t border-border bg-card py-2.5 text-center text-sm font-medium text-muted hover:underline ${className}`}
    >
      Powered by {label}
    </a>
  );
}
