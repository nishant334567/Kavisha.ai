export default function EngagementInsightsCard({
    loading,
    error,
    keywords = [],
    topQueries = [],
    meta = {},
}) {
    const emptyInsights =
        !loading &&
        !error &&
        keywords.length === 0 &&
        topQueries.length === 0;

    return (
        <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
            <div className="border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
                <h3 className="text-base font-semibold text-[#18A6B8]">
                    User engagement in depth
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                    AI summary of themes and questions from sessions with 6+ user
                    messages (lead journey). Uses stored chat summaries.
                </p>
            </div>

            <div className="px-4 py-4 sm:px-6 sm:py-5">
                {loading ? (
                    <p className="text-sm text-muted-foreground">Generating insights…</p>
                ) : error ? (
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                ) : emptyInsights ? (
                    <p className="text-sm text-muted-foreground">
                        No insights for this range (need sessions with 6+ user messages
                        and stored summaries).
                    </p>
                ) : (
                    <>
                        <div className="mb-5">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                                Top keywords
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {keywords.length === 0 ? (
                                    <span className="text-sm text-muted-foreground">
                                        —
                                    </span>
                                ) : (
                                    keywords.map((k, idx) => (
                                        <span
                                            key={`${idx}-${k}`}
                                            className="rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs font-medium text-foreground"
                                        >
                                            {k}
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                                Queries raised by the users the most:
                            </p>
                            {topQueries.length === 0 ? (
                                <p className="text-sm text-muted-foreground">—</p>
                            ) : (
                                <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground">
                                    {topQueries.map((q, idx) => (
                                        <li key={`${idx}-${q.slice(0, 48)}`}>{q}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        {meta?.summariesTruncated ? (
                            <p className="mt-4 text-[11px] text-muted-foreground">
                                Input was truncated for length; insights reflect a
                                subset of summaries.
                            </p>
                        ) : null}
                        {typeof meta?.summariesUsed === "number" &&
                        meta.summariesUsed > 0 ? (
                            <p className="mt-2 text-[11px] text-muted-foreground">
                                Based on {meta.summariesUsed} session summary
                                {meta.summariesUsed === 1 ? "" : "ies"}
                                {typeof meta.eligibleSessionCount === "number"
                                    ? ` (${meta.eligibleSessionCount} eligible sessions in range)`
                                    : ""}
                                .
                            </p>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
}
