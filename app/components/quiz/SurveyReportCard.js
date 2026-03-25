"use client";
import { FileText, Sparkles } from "lucide-react";
import FormatText from "@/app/components/FormatText";

export default function SurveyReportCard({ report }) {
  if (!report?.llmAnalysis) return null;

  return (
    <div className="mb-4 rounded-lg border border-border bg-card p-4 text-foreground shadow-sm sm:mb-6 sm:rounded-xl sm:p-6">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <div className="rounded-lg bg-muted-bg p-2">
          <Sparkles className="h-5 w-5 text-highlight sm:h-6 sm:w-6" />
        </div>
        <h2 className="text-lg font-semibold text-highlight sm:text-xl">
          Survey Analysis Report
        </h2>
      </div>
      <div className="rounded-lg border border-border bg-background p-4 sm:p-6">
        <FormatText text={report.llmAnalysis} />
      </div>
      {report.generatedAt && (
        <div className="mt-3 text-center text-xs text-muted sm:mt-4">
          Generated on {new Date(report.generatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
