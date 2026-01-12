"use client";
import { FileText, Sparkles } from "lucide-react";

export default function SurveyReportCard({ report }) {
  if (!report?.llmAnalysis) return null;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
          Survey Analysis Report
        </h2>
      </div>
      <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
        <div className="prose prose-sm sm:prose-base max-w-none">
          <div className="whitespace-pre-wrap text-sm sm:text-base text-gray-700 leading-relaxed">
            {report.llmAnalysis}
          </div>
        </div>
      </div>
      {report.generatedAt && (
        <div className="text-xs text-gray-500 mt-3 sm:mt-4 text-center">
          Generated on {new Date(report.generatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
