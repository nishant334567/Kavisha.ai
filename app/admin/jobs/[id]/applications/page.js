"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { ArrowLeft, Star } from "lucide-react";
import ApplicantCard from "./ApplicantCard";
import Livechat from "@/app/components/LiveChat";

export default function Applications() {
    const params = useParams();
    const brandContext = useBrandContext();
    const brand = brandContext?.subdomain;
    const { user } = useFirebaseSession();

    const [applications, setApplications] = useState([]);
    const [job, setJob] = useState(null);
    const [statusFilter, setStatusFilter] = useState("");
    const [starredOnly, setStarredOnly] = useState(false);
    const [openChat, setOpenChat] = useState(false);
    const [userA, setUserA] = useState(null);
    const [userB, setUserB] = useState(null);
    const [connectionId, setConnectionId] = useState(null);

    const openChatSession = (adminId, applicantUserId) => {
        setUserA(adminId);
        setUserB(applicantUserId);
        setConnectionId([adminId, applicantUserId].sort().join("_"));
        setOpenChat(true);
    };

    useEffect(() => {
        if (!brand || !params?.id) return;
        (async () => {
            try {
                const res = await fetch(
                    `/api/admin/jobs/${params.id}/applications?brand=${encodeURIComponent(brand)}`,
                    { credentials: "include" },
                );
                const data = await res.json();
                if (res.ok) {
                    setApplications(Array.isArray(data.applications) ? data.applications : []);
                    setJob(data.job || null);
                } else {
                    setApplications([]);
                    setJob(null);
                }
            } catch {
                setApplications([]);
                setJob(null);
            }
        })();
    }, [brand, params?.id]);

    const backHref = brand ? `/admin/jobs/${params?.id}?subdomain=${encodeURIComponent(brand)}` : `/admin/jobs/${params?.id}`;

    const statusCategories = Array.isArray(job?.statusCategories) ? job.statusCategories : [];
    let filteredApplications = !statusFilter
        ? applications
        : statusFilter === "__none__"
            ? applications.filter((a) => !(a.status ?? "").trim())
            : applications.filter((a) => (a.status ?? "").trim() === statusFilter);
    if (starredOnly) {
        filteredApplications = filteredApplications.filter((a) => !!a.starred);
    }

    return (
        <div className="max-w-[90%] mx-auto px-4 py-6 space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                    <Link
                        href={backHref}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted hover:bg-muted-bg hover:text-foreground"
                        aria-label="Back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold text-highlight">
                            Job applications
                        </h1>
                        {job?.title && (
                            <p className="mt-0.5 text-sm text-muted">
                                Profile: {job.title}
                            </p>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={() => setStarredOnly((prev) => !prev)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        starredOnly
                            ? "border-amber-300/60 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                            : "border-border bg-card text-muted hover:bg-muted-bg"
                    }`}
                >
                    <Star className={`h-4 w-4 shrink-0 ${starredOnly ? "fill-amber-400 text-amber-500" : "text-muted"}`} />
                    Starred only
                </button>
                {statusCategories.length > 0 && (
                <div className="flex items-center gap-2">
                    <label htmlFor="status-filter" className="shrink-0 text-sm font-medium text-foreground">
                        Filter by status
                    </label>
                    <select
                        id="status-filter"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="min-w-[160px] rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                    >
                        <option value="">All</option>
                        {statusCategories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="__none__">No status</option>
                    </select>
                </div>
                )}
                {(statusFilter || starredOnly) && (
                    <span className="text-sm text-muted">
                        {filteredApplications.length} of {applications.length} shown
                    </span>
                )}
            </div>

            <div className="space-y-4">
                {filteredApplications.map((app) => (
                    <ApplicantCard
                        key={app._id}
                        applicant={app}
                        jobId={params?.id}
                        brand={brand}
                        statusCategories={Array.isArray(job?.statusCategories) ? job.statusCategories : []}
                        onUpdate={(updated) => {
                            setApplications((prev) =>
                                prev.map((a) => (a._id === updated._id ? updated : a))
                            );
                        }}
                        onJobUpdate={(updatedJob) => setJob(updatedJob)}
                        onConnect={openChatSession}
                        currentUserId={user?.id}
                    />
                ))}
            </div>

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
