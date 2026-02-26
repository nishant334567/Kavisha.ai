"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { ArrowLeft } from "lucide-react";
import ApplicantCard from "./ApplicantCard";
import Livechat from "@/app/components/LiveChat";

export default function Applications() {
    const params = useParams();
    const brandContext = useBrandContext();
    const brand = brandContext?.subdomain;
    const { user } = useFirebaseSession();

    const [applications, setApplications] = useState([]);
    const [job, setJob] = useState(null);
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

    return (
        <div className="max-w-[90%] mx-auto px-4 py-6 space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                    <Link
                        href={backHref}
                        className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0"
                        aria-label="Back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold text-[#004A4E]">
                            Job applications
                        </h1>
                        {job?.title && (
                            <p className="text-sm text-gray-500 mt-0.5">
                                Profile: {job.title}
                            </p>
                        )}
                    </div>
                </div>
            </header>

            <div className="space-y-4">
                {applications.map((app) => (
                    <ApplicantCard
                        key={app._id}
                        applicant={app}
                        jobId={params?.id}
                        brand={brand}
                        onUpdate={(updated) => {
                            setApplications((prev) =>
                                prev.map((a) => (a._id === updated._id ? updated : a))
                            );
                        }}
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
