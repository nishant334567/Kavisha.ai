"use client";

import { useState } from "react";

const INITIAL = 5;

export default function TopKbDocsCard({ docs = [] }) {
    const [expanded, setExpanded] = useState(false);
    const hasMore = docs.length > INITIAL;
    const visible = expanded ? docs : docs.slice(0, INITIAL);

    return (
        <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
            <div className="border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
                <h3 className="text-base font-semibold text-[#18A6B8]">
                    Top KB documents
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                    By number of assistant answers that cited each doc (once per answer per doc).
                </p>
            </div>
            <ul className="divide-y divide-border/60">
                {docs.length === 0 ? (
                    <li className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">
                        No citations recorded in this range yet.
                    </li>
                ) : (
                    <>
                        {visible.map((d) => (
                            <li
                                key={d.docid}
                                className="flex items-start justify-between gap-3 px-4 py-3 sm:px-6"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium text-foreground">
                                        {d.title?.trim() || "Untitled"}
                                    </div>
                                    <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                                        {d.docid}
                                    </div>
                                    {d.sourceUrl ? (
                                        <a
                                            href={d.sourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-1 block truncate text-xs text-[#18A6B8] hover:underline"
                                        >
                                            {d.sourceUrl}
                                        </a>
                                    ) : null}
                                </div>
                                <span className="shrink-0 text-sm font-semibold tabular-nums text-[#18A6B8]">
                                    {d.referenceCount}
                                </span>
                            </li>
                        ))}
                        {hasMore ? (
                            <li className="px-4 py-2 sm:px-6">
                                <button
                                    type="button"
                                    onClick={() => setExpanded((v) => !v)}
                                    className="text-xs font-medium text-[#18A6B8] hover:underline"
                                >
                                    {expanded
                                        ? "Show less"
                                        : `Show ${docs.length - INITIAL} more`}
                                </button>
                            </li>
                        ) : null}
                    </>
                )}
            </ul>
        </div>
    );
}
