"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import CommunityCard from "@/app/components/CommunityCard";
import ChatSidebar from "@/app/components/ChatSidebar";
import CommunitySelectionDialog from "@/app/components/CommunitySelectionDialog";
import LiveChat from "@/app/components/LiveChat";
import Loader from "@/app/components/Loader";

const ROLE_LABELS = {
    job_seeker: "Job",
    recruiter: "Hiring",
    friends: "Friend",
};

function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function flattenRequirements(users) {
    const list = [];
    for (const u of users || []) {
        for (const s of u.sessions || []) {
            list.push({
                id: s._id?.toString?.(),
                userId: u.userId,
                name: u.name,
                description: s.chatSummary || s.title || "",
                date: formatDate(s.createdAt),
                requirement: ROLE_LABELS[s.role] || s.role || "—",
            });
        }
    }
    return list;
}

export default function Community() {
    const router = useRouter();
    const brand = useBrandContext();
    const { user, loading: authLoading } = useFirebaseSession();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allChats, setAllChats] = useState(null);
    const [activeChats, setActiveChats] = useState([]);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [openChat, setOpenChat] = useState(false);
    const [chatUserA, setChatUserA] = useState(null);
    const [chatUserB, setChatUserB] = useState(null);
    const [connectionId, setConnectionId] = useState(null);

    const openChatSession = (userA, userB) => {
        setChatUserA(userA);
        setChatUserB(userB);
        setConnectionId([userA, userB].sort().join("_"));
        setOpenChat(true);
    };

    useEffect(() => {
        if (!user || !brand?.subdomain) return;
        const endpoint =
            brand.subdomain === "kavisha"
                ? "/api/allchats?community=true"
                : `/api/allchats/${brand.subdomain}?community=true`;
        (async () => {
            try {
                const res = await fetch(endpoint);
                const data = await res.json();
                setAllChats(data);
            } catch (e) {
                setAllChats(null);
            }
        })();
    }, [user, brand?.subdomain]);

    useEffect(() => {
        if (!user?.id) return;
        (async () => {
            try {
                const res = await fetch(`/api/active-chats/${user.id}`);
                const data = await res.json();
                setActiveChats(Array.isArray(data) ? data : []);
            } catch (e) {
                setActiveChats([]);
            }
        })();
    }, [user?.id]);

    useEffect(() => {
        const subdomain = brand?.subdomain;
        if (!subdomain) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        (async () => {
            try {
                const res = await fetch(
                    `/api/community/sessions?brand=${encodeURIComponent(subdomain)}`
                );
                const data = await res.json();
                if (data.success && Array.isArray(data.users)) setUsers(data.users);
                else setUsers([]);
            } catch (e) {
                setError(e?.message || "Failed to load.");
                setUsers([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [brand?.subdomain]);

    const requirements = useMemo(() => flattenRequirements(users), [users]);

    const connectedUserIds = useMemo(() => {
        const set = new Set();
        const myId = user?.id ? String(user.id) : "";
        for (const chat of activeChats || []) {
            const a = chat.userA != null ? String(chat.userA) : "";
            const b = chat.userB != null ? String(chat.userB) : "";
            const other = a === myId ? b : a;
            if (other) set.add(other);
        }
        return set;
    }, [activeChats, user?.id]);

    const updateChatId = (newChatId) => {
        if (newChatId) router.push(`/community/${newChatId}`);
        else router.push("/community");
    };

    if (authLoading) return <Loader loadingMessage="Loading..." />;
    if (!user) return null;

    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden">
            <div className="flex h-full overflow-hidden">
                <div>
                    <ChatSidebar
                        allChats={allChats}
                        updateChatId={updateChatId}
                        currentChatId={null}
                        setCurrentChatType={() => { }}
                        onCollapsedChange={setIsSidebarCollapsed}
                        isCommunity={true}
                        onNewCommunityChat={() => setDialogOpen(true)}
                        chatBasePath="/community"
                        homePath="/community"
                    />
                </div>
                <div className="w-full min-h-0 overflow-auto">
                    <div className="mt-16 px-4 pb-8">
                        <div className="font-fredoka flex justify-between p-4">
                            <div>
                                <p className="text-[#3D5E6B] text-4xl">Community</p>
                                <p className="text-md font-extralight">
                                    Browse through all requirements and find what you need!
                                </p>
                            </div>
                            <div>
                                <button
                                    type="button"
                                    className="rounded-full bg-[#3D5E6B] text-white px-4 py-1 hover:bg-[#2d4e5b] transition-colors"
                                    onClick={() => setDialogOpen(true)}
                                >
                                    + Create new post
                                </button>
                            </div>
                        </div>
                        {loading ? (
                            <div className="p-8 flex justify-center">
                                <Loader loadingMessage="Loading community..." />
                            </div>
                        ) : error ? (
                            <div className="p-8 text-center text-red-600">{error}</div>
                        ) : requirements.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No community posts yet.
                            </div>
                        ) : (
                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {requirements.map((r) => (
                                    <CommunityCard
                                        key={r.id}
                                        name={r.name}
                                        date={r.date}
                                        description={r.description}
                                        requirement={r.requirement}
                                        onConnect={() => openChatSession(user.id, r.userId)}
                                        connectLabel={connectedUserIds.has(r.userId) ? "Message" : "Connect"}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <CommunitySelectionDialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
            />

            {/* 1-on-1 chat overlay when Connect is clicked */}
            {openChat && chatUserA && chatUserB && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                    <div className="bg-white w-full max-w-lg h-[80vh] border border-slate-200 shadow-2xl flex flex-col overflow-hidden rounded-xl">
                        <LiveChat
                            userA={chatUserA}
                            userB={chatUserB}
                            currentUserId={user?.id}
                            onClose={() => setOpenChat(false)}
                            connectionId={connectionId}
                            isEmbedded={true}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}