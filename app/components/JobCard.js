"use client";

import Link from "next/link";
import { FileCheck } from "lucide-react";

/**
 * Job card: title, description, and buttons — View JD, Apply / View your application.
 * When alreadyApplied, shows "Applied" badge, "View your application" link, and grayed-out Apply.
 */
export default function JobCard({ job, alreadyApplied = false, className = "" }) {
  if (!job) return null;

  const { _id, title, description = "", jdLink } = job;
  const truncatedDescription =
    description && description.length > 180 ? description.slice(0, 179).trim() + "…" : description;
  const applyHref = _id ? `/job-apply/${_id}` : "#";
  const jobPageHref = _id ? `/jobs/${_id}` : "#";

  return (
    <article
      className={`relative flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 min-h-[200px] ${className}`}
    >
      {alreadyApplied && (
        <span className="absolute top-3 right-3 rounded-full bg-gray-200 text-gray-600 text-xs font-medium px-2.5 py-1">
          Applied
        </span>
      )}

      <Link
        href={jobPageHref}
        className="block flex-1 min-h-0 group cursor-pointer pr-16"
      >
        <h2 className="text-[#004A4E] font-bold text-lg leading-tight group-hover:underline">
          {title}
        </h2>

        {truncatedDescription ? (
          <p className="text-sm text-gray-600 leading-relaxed mt-2 line-clamp-3">
            {truncatedDescription}
          </p>
        ) : (
          <div className="mt-2 flex-1 min-h-[3rem]" />
        )}
      </Link>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {jdLink ? (
          <a
            href={jdLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-0 inline-flex items-center justify-center px-4 py-2 rounded-lg border-2 border-[#004A4E] text-[#004A4E] text-sm font-medium hover:bg-[#004A4E]/5 transition-colors"
          >
            View JD
          </a>
        ) : null}
        {alreadyApplied ? (
          <Link
            href={applyHref}
            className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#004A4E] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <FileCheck className="w-4 h-4 shrink-0" /> View your application
          </Link>
        ) : (
          <Link
            href={applyHref}
            className="flex-1 min-w-0 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#004A4E] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Apply
          </Link>
        )}
      </div>
    </article>
  );
}
