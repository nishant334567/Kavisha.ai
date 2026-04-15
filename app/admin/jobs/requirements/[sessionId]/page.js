"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import AdminChatSessionView from "@/app/admin/components/AdminChatSessionView";

export default function AdminRequirementSessionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = params?.sessionId ? String(params.sessionId) : "";
  const brand =
    searchParams?.get("subdomain")?.trim() || searchParams?.get("brand")?.trim() || "";
  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";

  return (
    <div className="flex h-[min(85vh,calc(100vh-5rem))] min-h-[480px] flex-col px-4 py-4">
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => router.push(`/admin/jobs/requirements${qs}`)}
          className="inline-flex items-center gap-1 rounded-lg p-2 text-sm text-highlight hover:bg-muted-bg"
          aria-label="Back to new requirements"
        >
          <ArrowLeft className="h-4 w-4" />
          New requirements
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border">
        {sessionId ? (
          <AdminChatSessionView sessionId={sessionId} />
        ) : (
          <p className="p-6 text-sm text-muted">Invalid session.</p>
        )}
      </div>
    </div>
  );
}
