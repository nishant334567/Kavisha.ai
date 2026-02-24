"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft, FileText, ExternalLink, Users, ChevronDown, ChevronUp } from "lucide-react";

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsOpen, setApplicationsOpen] = useState(true);

  useEffect(() => {
    if (!brand || !params?.id) return;
    (async () => {
      try {
        const res = await fetch(`/api/admin/jobs/${params.id}?brand=${encodeURIComponent(brand)}`);
        const data = await res.json();
        setJob(res.ok ? (data.job ?? null) : null);
      } catch {
        setJob(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [brand, params?.id]);

  useEffect(() => {
    if (!brand || !params?.id) return;
    setApplicationsLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/jobs/${params.id}/applications?brand=${encodeURIComponent(brand)}`,
          { credentials: "include" }
        );
        const data = await res.json();
        setApplications(res.ok && Array.isArray(data.applications) ? data.applications : []);
      } catch {
        setApplications([]);
      } finally {
        setApplicationsLoading(false);
      }
    })();
  }, [brand, params?.id]);

  if (loading) return <div className="p-6 text-[#004A4E]">Loading…</div>;
  if (!job) return <div className="p-6 text-gray-500">Job not found.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-[#004A4E]/10 text-[#004A4E]"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-[#004A4E]">Job detail</h1>
      </div>

      <div className="p-4 rounded-xl border border-[#004A4E]/20 bg-white space-y-4 mb-6">
        <div>
          <h2 className="text-lg font-medium text-[#004A4E]">{job.title}</h2>
          {job.description ? (
            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{job.description}</p>
          ) : null}
        </div>

        <a
          href={job.jdLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-[#004A4E] font-medium hover:underline"
        >
          <FileText className="w-4 h-4" /> View JD <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {job.questions?.length > 0 ? (
          <div>
            <h3 className="text-sm font-medium text-[#004A4E] mb-2">Questions ({job.questions.length})</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {job.questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-[#004A4E]/20 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setApplicationsOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-[#004A4E]/5 transition-colors"
        >
          <span className="flex items-center gap-2 text-[#004A4E] font-medium">
            <Users className="w-5 h-5" /> Applications ({applications.length})
          </span>
          {applicationsOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {applicationsOpen && (
          <div className="border-t border-[#004A4E]/10">
            {applicationsLoading ? (
              <div className="p-4 text-sm text-gray-500">Loading applications…</div>
            ) : applications.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No applications yet.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {applications.map((app) => (
                  <li key={app._id} className="p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-800">{app.applicantEmail}</span>
                      <span className="text-xs text-gray-400">
                        {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                    {app.resumeLink && (
                      <a
                        href={app.resumeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-[#004A4E] font-medium hover:underline mb-2"
                      >
                        <FileText className="w-4 h-4" /> Resume <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {Array.isArray(app.questionsAnswers) && app.questionsAnswers.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {app.questionsAnswers.map((qa, i) => (
                          <div key={i} className="text-sm">
                            <p className="font-medium text-gray-700">{qa.question}</p>
                            <p className="text-gray-600 whitespace-pre-wrap">{qa.answer || "—"}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
