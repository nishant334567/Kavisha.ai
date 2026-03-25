"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { ArrowLeft, Star, FileText, ExternalLink, ChevronDown, Plus } from "lucide-react";
import AssignApplicationModal from "../AssignApplicationModal";
import Livechat from "@/app/components/LiveChat";

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
    const { user } = useFirebaseSession();
    const jobId = params?.id;
    const aid = params?.aid;

    const [job, setJob] = useState(null);
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [starUpdating, setStarUpdating] = useState(false);
    const [jobSectionOpen, setJobSectionOpen] = useState(false);
    const [openChat, setOpenChat] = useState(false);
    const [userA, setUserA] = useState(null);
    const [userB, setUserB] = useState(null);
    const [connectionId, setConnectionId] = useState(null);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [addCategorySubmitting, setAddCategorySubmitting] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);

    const statusCategories = Array.isArray(job?.statusCategories) ? job.statusCategories : [];
    const ADD_CATEGORY_VALUE = "__add_new__";

    const openChatSession = (adminId, applicantUserId) => {
        setUserA(adminId);
        setUserB(applicantUserId);
        setConnectionId([adminId, applicantUserId].sort().join("_"));
        setOpenChat(true);
    };

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
            <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
                <p className="text-muted">Loading…</p>
            </div>
        );
    }
    if (!job || !application) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
                <p className="text-muted">Application not found.</p>
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
    const status = application.status ?? "";

    const handleStatusChange = async (e) => {
        const value = e.target.value;
        if (value === ADD_CATEGORY_VALUE) {
            setShowAddCategory(true);
            return;
        }
        if (value === status || !jobId || !application._id || !brand) return;
        setStatusUpdating(true);
        try {
            const res = await fetch(
                `/api/admin/jobs/${jobId}/applications/${application._id}?brand=${encodeURIComponent(brand)}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: value }),
                    credentials: "include",
                }
            );
            const data = await res.json();
            if (data.success && data.application) setApplication(data.application);
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleAddCategory = async () => {
        const name = newCategoryName.trim();
        if (!name || !jobId || !brand || addCategorySubmitting) return;
        setAddCategorySubmitting(true);
        try {
            const res = await fetch(
                `/api/admin/jobs/${jobId}?brand=${encodeURIComponent(brand)}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ addStatusCategory: name }),
                    credentials: "include",
                }
            );
            const data = await res.json();
            if (data.success && data.job) {
                setJob(data.job);
                setNewCategoryName("");
                setShowAddCategory(false);
            }
        } finally {
            setAddCategorySubmitting(false);
        }
    };

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
        <div className="min-h-screen bg-background text-foreground">
            {/* Header: light, back, job title, star */}
            <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-4">
                <Link
                    href={applicationsListHref}
                    className="rounded-lg p-1.5 text-muted hover:bg-muted-bg hover:text-foreground"
                    aria-label="Back"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="flex-1 truncate text-lg font-bold text-highlight">{job.title}</h1>
                <button
                    type="button"
                    onClick={toggleStar}
                    disabled={starUpdating}
                    className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-muted-bg hover:text-foreground disabled:opacity-50"
                    aria-label={starred ? "Unstar" : "Star"}
                >
                    <Star className={`w-5 h-5 ${starred ? "fill-amber-400 text-amber-400" : ""}`} />
                </button>
            </header>

            <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-8">
                {/* Left column: job section + applicant summary + application form */}
                <div className="flex-1 min-w-0 lg:min-w-[60%] space-y-8">
                    {/* Job section: collapsible */}
                    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                        <button
                            type="button"
                            onClick={() => setJobSectionOpen((o) => !o)}
                            className="flex w-full items-center justify-between gap-2 px-6 py-4 text-left hover:bg-muted-bg"
                        >
                            <span className="font-semibold text-foreground">Job</span>
                            <ChevronDown className={`w-5 h-5 shrink-0 text-muted transition-transform ${jobSectionOpen ? "rotate-180" : ""}`} />
                        </button>
                        {jobSectionOpen && (
                            <div className="border-t border-border px-6 pb-6 pt-0">
                                {job.description ? (
                                    <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-muted">{job.description}</p>
                                ) : null}
                                {job.jdLink ? (
                                    <a
                                        href={job.jdLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-medium text-highlight hover:underline"
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
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                        <div className="flex gap-4 mb-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted-bg text-lg font-semibold text-muted">
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
                                <h2 className="text-xl font-bold text-highlight">{name}</h2>
                            </div>
                        </div>
                        {summary ? (
                            <p className="text-sm leading-relaxed text-muted">{summary}</p>
                        ) : (
                            <p className="text-sm italic text-muted">No summary available.</p>
                        )}
                    </div>

                    {/* Application form */}
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                        <h3 className="mb-6 text-lg font-bold text-foreground">
                            {name.replace(/\s+$/, "").split(" ")[0]}’s application form
                        </h3>
                        <div className="space-y-6">
                            {questionsAnswers.length === 0 ? (
                                <p className="text-sm text-muted">No questions answered.</p>
                            ) : (
                                questionsAnswers.map((qa, i) => (
                                    <div key={i} className="space-y-2">
                                        <p className="text-sm font-semibold text-foreground">
                                            {qa.question || "Question"}
                                        </p>
                                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
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
                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                        <h3 className="mb-4 text-sm font-semibold text-foreground">Contact</h3>
                        <dl className="space-y-3 text-sm">
                            <div>
                                <dt className="font-medium text-muted">Name</dt>
                                <dd className="mt-0.5 text-foreground">{name}</dd>
                            </div>
                            <div>
                                <dt className="font-medium text-muted">Email</dt>
                                <dd className="mt-0.5 break-all text-foreground">{email}</dd>
                            </div>
                            <div>
                                <dt className="font-medium text-muted">Phone number</dt>
                                <dd className="mt-0.5 text-foreground">—</dd>
                            </div>
                            <div>
                                <dt className="font-medium text-muted">Resume</dt>
                                <dd className="mt-0.5">
                                    {application.resumeLink ? (
                                        <a
                                            href={application.resumeLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 font-medium text-highlight hover:underline"
                                        >
                                            <FileText className="w-4 h-4 shrink-0" />
                                            View resume
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    ) : (
                                        <span className="text-muted">—</span>
                                    )}
                                </dd>
                            </div>
                            {application.applicantUserId && user?.id && (
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={() => openChatSession(user.id, application.applicantUserId)}
                                        className="w-full rounded-lg bg-highlight px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                                    >
                                        Connect
                                    </button>
                                </div>
                            )}
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

                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                        <h3 className="mb-3 text-sm font-semibold text-foreground">Status</h3>
                        <div className="space-y-2">
                            <select
                                value={status}
                                onChange={handleStatusChange}
                                disabled={statusUpdating}
                                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
                            >
                                <option value="">{statusCategories.length === 0 ? "No categories" : "Select status"}</option>
                                {statusCategories.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                                <option value={ADD_CATEGORY_VALUE}>+ Add new category</option>
                            </select>
                            {showAddCategory && (
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="Category name"
                                        className="min-w-0 flex-1 rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                                        onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCategory}
                                        disabled={!newCategoryName.trim() || addCategorySubmitting}
                                        className="flex shrink-0 items-center gap-1 rounded-lg bg-highlight px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowAddCategory(false); setNewCategoryName(""); }}
                                        className="shrink-0 text-sm text-muted hover:text-foreground"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {assignedTo.length > 0 && (
                        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                            <h3 className="mb-2 text-sm font-semibold text-foreground">Assigned to</h3>
                            <ul className="space-y-1 text-sm text-muted">
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
                        className="w-full rounded-lg bg-highlight px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
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

            {openChat && userA && userB && user?.id && (
                <Livechat
                    userA={userA}
                    userB={userB}
                    currentUserId={user.id}
                    onClose={() => setOpenChat(false)}
                    connectionId={connectionId}
                />
            )}
        </div>
    );
}
