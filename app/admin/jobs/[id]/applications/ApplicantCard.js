"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Star, Plus } from "lucide-react";
import AssignApplicationModal from "./AssignApplicationModal";

const ADD_CATEGORY_VALUE = "__add_new__";

function getInitials(email) {
    if (!email || typeof email !== "string") return "?";
    const local = email.split("@")[0] || "";
    if (local.length >= 2) return (local[0] + local[1]).toUpperCase();
    return local.slice(0, 2).toUpperCase() || "?";
}

function getDisplayName(email) {
    if (!email || typeof email !== "string") return "Applicant";
    const local = email.split("@")[0] || "";
    const name = local.replace(/[._0-9]+/g, " ").trim() || local;
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export default function ApplicantCard({
    applicant,
    jobId,
    brand,
    statusCategories = [],
    onUpdate,
    onJobUpdate,
    onConnect,
    currentUserId,
}) {
    const email = applicant?.applicantEmail ?? "";
    const name = applicant?.applicantName?.trim() || getDisplayName(email);
    const imageUrl = applicant?.applicantImage?.trim() || "";
    const summary = applicant?.applicationSummary ?? "";
    const initials = getInitials(email);
    const status = applicant?.status ?? "";
    const starred = !!applicant?.starred;
    const assignedTo = Array.isArray(applicant?.assignedTo) ? applicant.assignedTo : [];

    const [statusUpdating, setStatusUpdating] = useState(false);
    const [starUpdating, setStarUpdating] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [addCategorySubmitting, setAddCategorySubmitting] = useState(false);

    const handleStatusChange = async (e) => {
        const value = e.target.value;
        if (value === ADD_CATEGORY_VALUE) {
            setShowAddCategory(true);
            e.target.value = status;
            return;
        }
        if (value === status || !jobId || !applicant?._id || !brand) return;
        setStatusUpdating(true);
        try {
            const res = await fetch(
                `/api/admin/jobs/${jobId}/applications/${applicant._id}?brand=${encodeURIComponent(brand)}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: value }),
                    credentials: "include",
                }
            );
            const data = await res.json();
            if (data.success && data.application) onUpdate?.(data.application);
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
                onJobUpdate?.(data.job);
                setNewCategoryName("");
                setShowAddCategory(false);
            }
        } finally {
            setAddCategorySubmitting(false);
        }
    };

    const handleAssignSuccess = (updatedApp) => {
        onUpdate?.(updatedApp);
    };

    const toggleStar = async () => {
        if (!jobId || !applicant?._id || !brand || starUpdating) return;
        setStarUpdating(true);
        try {
            const res = await fetch(
                `/api/admin/jobs/${jobId}/applications/${applicant._id}?brand=${encodeURIComponent(brand)}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ starred: !starred }),
                    credentials: "include",
                }
            );
            const data = await res.json();
            if (data.success && data.application) onUpdate?.(data.application);
        } finally {
            setStarUpdating(false);
        }
    };

    const effectiveSelectValue = status || "";

    return (
        <>
            <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 font-fredoka shadow-md sm:flex-row">
                <div className="flex-1 min-w-0 sm:min-w-[60%]">
                    <div className="flex gap-4 mb-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted-bg text-lg font-semibold text-muted">
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt=""
                                    className="w-full h-full object-cover shadow-md"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                initials
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="min-w-0 truncate text-lg font-medium leading-tight text-foreground">
                                    {name}
                                </h3>
                                <button
                                    type="button"
                                    onClick={toggleStar}
                                    disabled={starUpdating}
                                    className="shrink-0 rounded p-1 hover:bg-muted-bg disabled:opacity-50"
                                    aria-label={starred ? "Unstar" : "Star"}
                                >
                                    <Star className={`h-5 w-5 ${starred ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                                </button>
                            </div>
                            <p className="mt-0.5 truncate text-sm text-muted">{email}</p>
                        </div>
                    </div>
                    {summary ? (
                        <p className="text-[12px] leading-snug text-foreground">{summary}</p>
                    ) : (
                        <p className="text-[12px] italic text-muted">No summary available.</p>
                    )}
                    {assignedTo.length > 0 && (
                        <p className="mt-1.5 text-xs text-muted">
                            Assigned to: {assignedTo.join(", ")}
                        </p>
                    )}
                </div>

                <div className="flex flex-col items-stretch sm:items-end gap-3 shrink-0 w-full sm:w-[200px]">
                    <div className="w-full space-y-2">
                        <div className="relative">
                            <select
                                value={effectiveSelectValue}
                                onChange={handleStatusChange}
                                disabled={statusUpdating}
                                className="w-full appearance-none rounded-full border border-border bg-input py-2 pl-3 pr-8 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
                            >
                                <option value="">{statusCategories.length === 0 ? "No categories" : "Select status"}</option>
                                {statusCategories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                                <option value={ADD_CATEGORY_VALUE}>+ Add new category</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        </div>
                        {showAddCategory && (
                            <div className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="Category name"
                                    className="min-w-0 flex-1 rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ring/30"
                                    onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddCategory}
                                    disabled={!newCategoryName.trim() || addCategorySubmitting}
                                    className="shrink-0 px-3 py-1.5 rounded-lg bg-[#004A4E] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddCategory(false);
                                        setNewCategoryName("");
                                    }}
                                    className="shrink-0 text-sm text-muted hover:text-foreground"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowAssignModal(true)}
                        className="w-full px-2 py-1 rounded-full bg-[#004A4E] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        Assign to Admin
                    </button>
                    {jobId && applicant?._id ? (
                        <Link
                            href={brand ? `/admin/jobs/${jobId}/applications/${applicant._id}?subdomain=${encodeURIComponent(brand)}` : `/admin/jobs/${jobId}/applications/${applicant._id}`}
                            className="w-full px-2 py-1 rounded-full bg-[#004A4E] text-white text-sm font-medium hover:opacity-90 transition-opacity text-center inline-block"
                        >
                            View application
                        </Link>
                    ) : (
                        <span className="inline-block w-full cursor-not-allowed rounded-full bg-muted-bg px-2 py-1 text-center text-sm font-medium text-muted">
                            View application
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            const uid = applicant?.applicantUserId;
                            if (currentUserId && uid && onConnect) onConnect(currentUserId, uid);
                        }}
                        disabled={!currentUserId || !applicant?.applicantUserId || !onConnect}
                        className="w-full px-2 py-1 rounded-full bg-[#004A4E] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Connect
                    </button>
                </div>
            </div>

            {showAssignModal && (
                <AssignApplicationModal
                    applicationId={applicant?._id}
                    jobId={jobId}
                    brand={brand}
                    currentAssignedTo={assignedTo}
                    onClose={() => setShowAssignModal(false)}
                    onSuccess={handleAssignSuccess}
                />
            )}
        </>
    );
}
