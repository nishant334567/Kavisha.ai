"use client";

export default function PoweredByKavisha({ className = "" }) {
  const isStaging =
    typeof window !== "undefined" && window.location.hostname.includes(".staging.");
  const href = isStaging ? "https://kavisha.staging.kavisha.ai" : "https://kavisha.ai";
  const label = isStaging ? "kavisha.staging.kavisha.ai" : "kavisha.ai";

  return (
    <p className={`text-center text-[11px] leading-none text-muted ${className}`.trim()}>
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
