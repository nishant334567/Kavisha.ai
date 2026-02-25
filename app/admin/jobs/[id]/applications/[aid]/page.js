"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft, Star, FileText, ExternalLink, ChevronDown } from "lucide-react";
import AssignApplicationModal from "../AssignApplicationModal";

function getDisplayName(applicant) {
    const name = applicant?.applicantName?.trim();
    if (name) return name;
    const email = applicant?.applicantEmail ?? "";
    if (!email) return "Applicant";
    const local = email.split("@")[0] || "";
    const fromEmail = local.replace(/[._0-9]+/g, " ").trim() || local;
    return fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1).toLowerCase();
}

function getInitials(email) {
    if (!email || typeof email !== "string") return "?";
    const local = email.split("@")[0] || "";
    if (local.length >= 2) return (local[0] + local[1]).toUpperCase();
    return local.slice(0, 2).toUpperCase() || "?";
}

export default function ApplicationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const brand = useBrandContext()?.subdomain;
    const jobId = params?.id;
    const aid = params?.aid;

    const [job, setJob] = useState(null);
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [starUpdating, setStarUpdating] = useState(false);
    const [jobSectionOpen, setJobSectionOpen] = useState(false);

    useEffect(() => {
        if (!jobId || !aid) return;
        (async () => {
            setLoading(true);
            try {
                const res = await fetch(
                    `/api/admin/jobs/${jobId}/applications/${aid}?brand=${encodeURIComponent(brand || "")}`,
                    { credentials: "include" }
                );
                if (res.status === 401) {
                    setLoading(false);
                    const currentPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
                    if (typeof window !== "undefined") {
                        localStorage.setItem("redirectAfterLogin", currentPath);
                    }
                    router.replace("/?redirect=" + encodeURIComponent(currentPath));
                    return;
                }
                const data = await res.json();
                if (res.ok && data.job && data.application) {
                    setJob(data.job);
                    setApplication(data.application);
                } else {
                    setJob(null);
                    setApplication(null);
                }
            } catch {
                setJob(null);
                setApplication(null);
            } finally {
                setLoading(false);
            }
        })();
    }, [brand, jobId, aid, pathname, searchParams, router]);

    const applicationsListHref =
        brand && jobId
            ? `/admin/jobs/${jobId}/applications?subdomain=${encodeURIComponent(brand)}`
            : `/admin/jobs/${jobId}/applications`;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500">Loading…</p>
            </div>
        );
    }
    if (!job || !application) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500">Application not found.</p>
            </div>
        );
    }

    const name = getDisplayName(application);
    const email = application.applicantEmail ?? "";
    const imageUrl = application.applicantImage?.trim() || "";
    const summary = application.applicationSummary ?? "";
    const initials = getInitials(email);
    const questionsAnswers = Array.isArray(application.questionsAnswers)
        ? application.questionsAnswers
        : [];
    const assignedTo = Array.isArray(application.assignedTo) ? application.assignedTo : [];
    const starred = !!application.starred;

    const toggleStar = async () => {
        if (!jobId || !application._id || !brand || starUpdating) return;
        setStarUpdating(true);
        try {
            const res = await fetch(
                `/api/admin/jobs/${jobId}/applications/${application._id}?brand=${encodeURIComponent(brand)}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ starred: !starred }),
                    credentials: "include",
                }
            );
            const data = await res.json();
            if (data.success && data.application) setApplication(data.application);
        } finally {
            setStarUpdating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header: light, back, job title, star */}
            <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
                <Link
                    href={applicationsListHref}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700"
                    aria-label="Back"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-lg font-bold text-gray-900 truncate flex-1">{job.title}</h1>
                <button
                    type="button"
                    onClick={toggleStar}
                    disabled={starUpdating}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700 shrink-0 disabled:opacity-50"
                    aria-label={starred ? "Unstar" : "Star"}
                >
                    <Star className={`w-5 h-5 ${starred ? "fill-amber-400 text-amber-400" : ""}`} />
                </button>
            </header>

            <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-8">
                {/* Left column: job section + applicant summary + application form */}
                <div className="flex-1 min-w-0 lg:min-w-[60%] space-y-8">
                    {/* Job section: collapsible */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setJobSectionOpen((o) => !o)}
                            className="w-full px-6 py-4 flex items-center justify-between gap-2 text-left hover:bg-gray-50"
                        >
                            <span className="font-semibold text-gray-900">Job</span>
                            <ChevronDown className={`w-5 h-5 text-gray-500 shrink-0 transition-transform ${jobSectionOpen ? "rotate-180" : ""}`} />
                        </button>
                        {jobSectionOpen && (
                            <div className="px-6 pb-6 pt-0 border-t border-gray-100">
                                {job.description ? (
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">{job.description}</p>
                                ) : null}
                                {job.jdLink ? (
                                    <a
                                        href={job.jdLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm text-[#004A4E] font-medium hover:underline"
                                    >
                                        <FileText className="w-4 h-4 shrink-0" />
                                        View JD
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                ) : null}
                            </div>
                        )}
                    </div>

                    {/* Applicant summary card */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <div className="flex gap-4 mb-4">
                            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold text-lg shrink-0 overflow-hidden">
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    initials
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-xl font-bold text-gray-900">{name}</h2>
                            </div>
                        </div>
                        {summary ? (
                            <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
                        ) : null}
                    </div>

                    {/* Application form */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">
                            {name.replace(/\s+$/, "").split(" ")[0]}’s application form
                        </h3>
                        <div className="space-y-6">
                            {questionsAnswers.length === 0 ? (
                                <p className="text-sm text-gray-500">No questions answered.</p>
                            ) : (
                                questionsAnswers.map((qa, i) => (
                                    <div key={i} className="space-y-2">
                                        <p className="text-sm font-semibold text-gray-800">
                                            {qa.question || "Question"}
                                        </p>
                                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                                            {qa.answer || "—"}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right column: contact, summary, assigned, Assign to Admin */}
                <div className="lg:w-80 shrink-0 space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact</h3>
                        <dl className="space-y-3 text-sm">
                            <div>
                                <dt className="text-gray-500 font-medium">Name</dt>
                                <dd className="text-gray-900 mt-0.5">{name}</dd>
                            </div>
                            <div>
                                <dt className="text-gray-500 font-medium">Email</dt>
                                <dd className="text-gray-900 mt-0.5 break-all">{email}</dd>
                            </div>
                            <div>
                                <dt className="text-gray-500 font-medium">Phone number</dt>
                                <dd className="text-gray-900 mt-0.5">—</dd>
                            </div>
                            <div>
                                <dt className="text-gray-500 font-medium">Resume</dt>
                                <dd className="mt-0.5">
                                    {application.resumeLink ? (
                                        <a
                                            href={application.resumeLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-[#004A4E] font-medium hover:underline"
                                        >
                                            <FileText className="w-4 h-4 shrink-0" />
                                            View resume
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    ) : (
                                        <span className="text-gray-500">—</span>
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Summary</h3>
            {summary ? (
              <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
            ) : (
              <p className="text-sm text-gray-500">No summary.</p>
            )}
          </div> */}

                    {assignedTo.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            <h3 className="text-sm font-semibold text-gray-900 mb-2">Assigned to</h3>
                            <ul className="text-sm text-gray-700 space-y-1">
                                {assignedTo.map((adminEmail) => (
                                    <li key={adminEmail} className="break-all">
                                        {adminEmail}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setShowAssignModal(true)}
                        className="w-full py-3 px-4 rounded-lg bg-[#004A4E] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        Assign to Admin
                    </button>
                </div>
            </div>

            {showAssignModal && (
                <AssignApplicationModal
                    applicationId={application._id}
                    jobId={jobId}
                    brand={brand}
                    currentAssignedTo={assignedTo}
                    onClose={() => setShowAssignModal(false)}
                    onSuccess={(updated) => setApplication(updated)}
                />
            )}
        </div>
    );
}
