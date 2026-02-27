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
            <div className="flex flex-col sm:flex-row gap-5 p-4 rounded-2xl bg-white border border-gray-100 shadow-md font-fredoka">
                <div className="flex-1 min-w-0 sm:min-w-[60%]">
                    <div className="flex gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold text-lg shrink-0 overflow-hidden">
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
                                <h3 className="text-gray-900 font-medium text-lg leading-tight truncate min-w-0">
                                    {name}
                                </h3>
                                <button
                                    type="button"
                                    onClick={toggleStar}
                                    disabled={starUpdating}
                                    className="p-1 rounded hover:bg-gray-100 shrink-0 disabled:opacity-50"
                                    aria-label={starred ? "Unstar" : "Star"}
                                >
                                    <Star className={`w-5 h-5 ${starred ? "fill-amber-400 text-amber-400" : "text-gray-400"}`} />
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5 truncate">{email}</p>
                        </div>
                    </div>
                    {summary ? (
                        <p className="text-[12px] text-gray-800 leading-snug">{summary}</p>
                    ) : (
                        <p className="text-[12px] text-gray-500 italic">No summary available.</p>
                    )}
                    {assignedTo.length > 0 && (
                        <p className="text-xs text-gray-600 mt-1.5">
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
                                className="w-full appearance-none border border-gray-300 rounded-full pl-3 pr-8 py-2 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#004A4E] focus:border-transparent disabled:opacity-60"
                            >
                                <option value="">{statusCategories.length === 0 ? "No categories" : "Select status"}</option>
                                {statusCategories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                                <option value={ADD_CATEGORY_VALUE}>+ Add new category</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                        {showAddCategory && (
                            <div className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="Category name"
                                    className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#004A4E]/30"
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
                                    className="shrink-0 text-sm text-gray-500 hover:text-gray-700"
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
                        <span className="w-full px-2 py-1 rounded-full bg-gray-300 text-gray-500 text-sm font-medium text-center inline-block cursor-not-allowed">
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
