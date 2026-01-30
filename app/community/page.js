"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import CommunityCard from "@/app/components/CommunityCard";
import ChatSidebar from "@/app/components/ChatSidebar";
import LiveChat from "@/app/components/LiveChat";
import Loader from "@/app/components/Loader";
import { ArrowLeft } from "lucide-react";

const ROLE_LABELS = {
    job_seeker: "Jobs",
    recruiter: "Employees",
    friends: "Friends",
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
    const [creating, setCreating] = useState(null);
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

    const createCommunityPost = async (type, title, message) => {
        if (!user?.id || !brand?.subdomain) return;

        const services = brand?.services || [];
        const service = services.find((s) => s.name === type);
        const serviceKey = service?._key ?? services[0]?._key;
        if (!serviceKey) return;

        setCreating(type);
        try {
            const res = await fetch("/api/newchatsession", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role: type,
                    brand: brand.subdomain,
                    initialmessage: message,
                    isCommunityChat: true,
                    chatName: title,
                    serviceKey,
                }),
            });
            const data = await res.json();
            if (data?.success && data?.sessionId) {
                router.push(`/community/${data.sessionId}`);
            }
        } catch (e) {
            console.error("Error creating community session:", e);
        } finally {
            setCreating(null);
        }
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
                        onNewCommunityChat={createCommunityPost}
                        chatBasePath="/community"
                        homePath="/community"
                    />
                </div>
                <div className="w-full min-h-0 overflow-auto">
                    <div className="mt-20 px-28 pb-4">
                        {/* Back button */}
                        <button
                            onClick={() => router.push("/")}
                            className="flex items-center gap-2 text-[#3D5E6B] hover:text-[#2d4e5b] transition-colors px-4"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="font-fredoka">Back</span>
                        </button>

                        <div className="font-fredoka flex justify-between px-4 py-4">
                            <div>
                                <p className="text-[#3D5E6B] text-4xl">Community</p>
                                <p className="text-md font-extralight">
                                    Browse through all connection requests and get connecting!
                                </p>
                            </div>
                            <div className="flex gap-3 flex-wrap items-start">
                                <button
                                    type="button"
                                    disabled={creating === "job_seeker"}
                                    className="rounded-full bg-[#3D5E6B] text-white px-4 py-1 hover:bg-[#2d4e5b] transition-colors disabled:opacity-50"
                                    onClick={() => createCommunityPost("job_seeker", "Looking for work", "Hello! Looking for a job? Beautiful! Tell me all about it and we'll see what can be done. :)")}
                                >
                                    {creating === "job_seeker" ? "Creating..." : "Find Jobs"}
                                </button>
                                <button
                                    type="button"
                                    disabled={creating === "recruiter"}
                                    className="rounded-full bg-[#3D5E6B] text-white px-4 py-1 hover:bg-[#2d4e5b] transition-colors disabled:opacity-50"
                                    onClick={() => createCommunityPost("recruiter", "Looking at hiring", "Hello! Looking at hiring somebody? Beautiful! Tell me all about it and we'll see what can be done. :)")}
                                >
                                    {creating === "recruiter" ? "Creating..." : "Hire People"}
                                </button>
                                <button
                                    type="button"
                                    disabled={creating === "friends"}
                                    className="rounded-full bg-[#3D5E6B] text-white px-4 py-1 hover:bg-[#2d4e5b] transition-colors disabled:opacity-50"
                                    onClick={() => createCommunityPost("friends", "Looking for a friend", "Hello! Looking to connect with a friend? Beautiful! Tell me all about it and we'll see what can be done. :)")}
                                >
                                    {creating === "friends" ? "Creating..." : "Find Friends"}
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