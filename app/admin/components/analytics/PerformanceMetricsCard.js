import { CheckCircle2, Share2 } from "lucide-react";

export default function PerformanceMetricsCard({ answersLiked = 0, answersShared = 0 }) {
    return (
        <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
            <div className="border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
                <h3 className="text-base font-semibold text-[#18A6B8]">
                    Performance metrics
                </h3>
            </div>
            <div className="divide-y divide-border/60 px-4 sm:px-6">
                <div className="flex items-center gap-3 py-4">
                    <CheckCircle2
                        className="h-9 w-9 shrink-0 text-[#18A6B8]"
                        strokeWidth={2}
                        aria-hidden
                    />
                    <span className="min-w-0 flex-1 text-sm text-foreground">
                        Number of answers liked
                    </span>
                    <span className="shrink-0 text-lg font-semibold tabular-nums text-[#18A6B8]">
                        {answersLiked}
                    </span>
                </div>
                <div className="flex items-center gap-3 py-4">
                    <Share2
                        className="h-8 w-8 shrink-0 text-foreground"
                        strokeWidth={2}
                        aria-hidden
                    />
                    <span className="min-w-0 flex-1 text-sm text-foreground">
                        Number of answers shared
                    </span>
                    <span className="shrink-0 text-lg font-semibold tabular-nums text-[#18A6B8]">
                        {answersShared}
                    </span>
                </div>
            </div>
        </div>
    );
}
