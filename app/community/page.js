"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { signIn } from "@/app/lib/firebase/sign-in";
import {
    detectInAppBrowser,
    isMobileDevice,
    openInChrome,
} from "@/app/lib/in-app-browser";
import CommunityCard from "@/app/components/CommunityCard";
import ChatSidebar from "@/app/components/ChatSidebar";
import LiveChat from "@/app/components/LiveChat";
import Loader from "@/app/components/Loader";
import PoweredByKavisha from "@/app/components/PoweredByKavisha";
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
                role: s.role,
                requirement: ROLE_LABELS[s.role] || s.role || "—",
            });
        }
    }
    return list;
}

export default function Community() {
    const router = useRouter();
    const brand = useBrandContext();
    const { user, loading: authLoading, refresh } = useFirebaseSession();
    const [creating, setCreating] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allChats, setAllChats] = useState(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [openChat, setOpenChat] = useState(false);
    const [chatUserA, setChatUserA] = useState(null);
    const [chatUserB, setChatUserB] = useState(null);
    const [connectionId, setConnectionId] = useState(null);
    const [paidConnectionUserIds, setPaidConnectionUserIds] = useState([]);
    const [connectingToUserId, setConnectingToUserId] = useState(null);
    const [chatOtherDisplayName, setChatOtherDisplayName] = useState(null);
    const [signingIn, setSigningIn] = useState(false);
    const [popupBlockedHint, setPopupBlockedHint] = useState(false);
    const [isInAppBrowser, setIsInAppBrowser] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsInAppBrowser(detectInAppBrowser());
        setIsMobile(isMobileDevice());
    }, []);

    const isBlocked = isInAppBrowser && isMobile;

    const handleSignInToCommunity = async () => {
        if (isBlocked) {
            openInChrome();
            return;
        }
        setSigningIn(true);
        setPopupBlockedHint(false);
        try {
            await signIn();
            await refresh();
            // User state updates, component re-renders and shows community content
        } catch (e) {
            if (e?.code === "auth/popup-blocked") {
                setPopupBlockedHint(true);
            }
        } finally {
            setSigningIn(false);
        }
    };

    const openChatSession = (userA, userB, otherDisplayName = null) => {
        setChatUserA(userA);
        setChatUserB(userB);
        setConnectionId([userA, userB].sort().join("_"));
        setChatOtherDisplayName(otherDisplayName ?? null);
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
                const res = await fetch("/api/community/paid-connections", {
                    credentials: "include",
                });
                const data = await res.json();
                setPaidConnectionUserIds(Array.isArray(data?.paidTargetUserIds) ? data.paidTargetUserIds : []);
            } catch (e) {
                setPaidConnectionUserIds([]);
            }
        })();
    }, [user?.id]);
    //retrigger
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

    // Community connect: only paid connections can open chat without paying again. Other places can initiate messages separately.
    const paidConnectedUserIds = useMemo(
        () => new Set((paidConnectionUserIds || []).map((id) => String(id)).filter(Boolean)),
        [paidConnectionUserIds]
    );

    const updateChatId = (newChatId) => {
        if (newChatId) router.push(`/community/${newChatId}`);
        else router.push("/community");
    };

    // One way to load Razorpay: when user clicks Connect we load the script (or use it if already loaded), then open checkout.
    const ensureRazorpayLoaded = () => {
        if (typeof window === "undefined" || window.Razorpay) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://checkout.razorpay.com/v1/checkout.js";
            s.onload = resolve;
            s.onerror = () => reject(new Error("Could not load payment"));
            document.body.appendChild(s);
        });
    };

    const initiatePayment = async (thisUser, otherUser, onSuccess) => {
        if (paidConnectedUserIds.has(String(otherUser))) {
            openChatSession(thisUser, otherUser);
            setConnectingToUserId(null);
            return;
        }
        try {
            // 1) Get order from our API
            const res = await fetch("/api/razorpay/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ userId: thisUser, targetUserId: otherUser }),
            });
            const data = await res.json();
            if (!data?.orderId) throw new Error(data?.error || "Failed to create order");

            // 2) Load Razorpay script (no-op if already there), then open payment window
            await ensureRazorpayLoaded();
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: data.amount,
                currency: data.currency || "INR",
                order_id: data.orderId,
                name: "Kavisha",
                description: "Community Connect",
                prefill: { email: user?.email || "" },
                modal: {
                    ondismiss: () => setConnectingToUserId(null),
                },
                handler: async function (response) {
                    const verifyRes = await fetch("/api/razorpay/verify-payment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            userId: thisUser,
                            type: "community_connect",
                            metadata: { targetUserId: otherUser },
                            amount: data.amount,
                            currency: data.currency || "INR",
                        }),
                    });
                    const verifyData = await verifyRes.json();
                    if (verifyData?.success) onSuccess();
                    else {
                        setConnectingToUserId(null);
                        alert("Payment verification failed.");
                    }
                },
            };
            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", () => {
                setConnectingToUserId(null);
                alert("Payment failed. Please try again.");
            });
            rzp.open();
        } catch (err) {
            console.error(err);
            setConnectingToUserId(null);
            alert(err?.message || "Something went wrong.");
        }
    };

    const refetchPaidConnections = async () => {
        if (!user?.id) return;
        try {
            const res = await fetch("/api/community/paid-connections", { credentials: "include" });
            const data = await res.json();
            setPaidConnectionUserIds(Array.isArray(data?.paidTargetUserIds) ? data.paidTargetUserIds : []);
        } catch {
            setPaidConnectionUserIds([]);
        }
    };

    const handleConnect = (userA, userB, otherDisplayName = null) => {
        setConnectingToUserId(String(userB));
        if (paidConnectedUserIds.has(String(userB))) {
            openChatSession(userA, userB, otherDisplayName);
            setConnectingToUserId(null);
            return;
        }
        initiatePayment(userA, userB, () => {
            refetchPaidConnections();
            openChatSession(userA, userB, otherDisplayName);
            setConnectingToUserId(null);
        });
    };

    if (authLoading || !brand) return <Loader loadingMessage="Loading..." />;

    // Sign-in gate: show when not logged in (user lands on /community directly)
    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#EDF4F7] to-white px-4">
                <div className="max-w-md w-full text-center">
                    <h1 className="font-fredoka text-2xl md:text-3xl text-[#3D5E6B] mb-4">Community</h1>
                    <p className="text-[#4A6670] mb-8">
                        Sign in to browse connection requests and connect with people.
                    </p>
                    {popupBlockedHint && !isBlocked && (
                        <p className="text-amber-600 text-sm mb-4">Popup was blocked. Try again — it&apos;ll work.</p>
                    )}
                    {isBlocked ? (
                        <button
                            onClick={openInChrome}
                            className="px-6 py-3 rounded-full bg-[#3D5E6B] text-white font-akshar hover:bg-[#2d4e5b] transition-colors"
                        >
                            Open in Chrome to sign in
                        </button>
                    ) : (
                        <button
                            onClick={handleSignInToCommunity}
                            disabled={signingIn}
                            className="px-6 py-3 rounded-full bg-[#3D5E6B] text-white font-akshar hover:bg-[#2d4e5b] transition-colors disabled:opacity-50"
                        >
                            {signingIn ? "Signing in..." : "Sign in to continue"}
                        </button>
                    )}
                    <button
                        onClick={() => router.push("/")}
                        className="mt-6 flex items-center justify-center gap-2 text-[#3D5E6B] hover:opacity-80 mx-auto"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm">Back to home</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">
            <div className="flex flex-1 min-h-0 overflow-hidden">
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
                        defaultCollapsed={true}
                    />
                </div>
                <div className="w-full flex flex-col flex-1 min-h-0 min-w-0">
                    <div className="flex-1 min-h-0 overflow-auto">
                        <div className="mt-14 ">
                            {/* Back button - pl-12/pl-14 reserves space for collapsed sidebar toggle */}
                            <button
                                onClick={() => router.push("/")}
                                className="flex pl-12 items-center gap-2 text-[#3D5E6B] hover:text-[#2d4e5b] transition-colors py-1 -mb-1"
                            >
                                <ArrowLeft className="w-5 h-5 flex-shrink-0" />
                                <span className="font-fredoka text-sm sm:text-base">Back</span>
                            </button>

                            {!brand?.enableProfessionalConnect && !brand?.enableFriendConnect ? (
                                <div className="px-8 py-12 text-center font-fredoka text-[#3D5E6B] text-lg opacity-60">
                                    Community is not available right now.
                                </div>
                            ) : (
                                <>
                                    <div className="px-8 font-fredoka flex flex-col md:flex-row md:justify-between md:items-start gap-3 py-4 sm:py-3">
                                        <div className="min-w-0">
                                            <p className="text-[#3D5E6B] text-2xl sm:text-3xl lg:text-4xl">Community</p>
                                            <p className="text-sm sm:text-base font-extralight mt-1">
                                                Browse through all connection requests and get connecting. Or create your own! :)
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 sm:gap-3 items-center shrink-0">
                                            {brand?.enableProfessionalConnect && (
                                                <>
                                                    <button
                                                        type="button"
                                                        disabled={creating === "job_seeker"}
                                                        className="rounded-full bg-[#3D5E6B] text-white px-3 py-1.5 sm:px-4 text-sm sm:text-base hover:bg-[#2d4e5b] transition-colors disabled:opacity-50"
                                                        onClick={() => createCommunityPost("job_seeker", "Looking for work", "Hello! Looking for a job? Beautiful! Tell me all about it and we'll see what can be done. :)")}
                                                    >
                                                        {creating === "job_seeker" ? "Creating..." : "Find Jobs"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={creating === "recruiter"}
                                                        className="rounded-full bg-[#3D5E6B] text-white px-3 py-1.5 sm:px-4 text-sm sm:text-base hover:bg-[#2d4e5b] transition-colors disabled:opacity-50"
                                                        onClick={() => createCommunityPost("recruiter", "Looking at hiring", "Hello! Looking at hiring somebody? Beautiful! Tell me all about it and we'll see what can be done. :)")}
                                                    >
                                                        {creating === "recruiter" ? "Creating..." : "Hire People"}
                                                    </button>
                                                </>
                                            )}
                                            {brand?.enableFriendConnect && (
                                                <button
                                                    type="button"
                                                    disabled={creating === "friends"}
                                                    className="rounded-full bg-[#3D5E6B] text-white px-3 py-1.5 sm:px-4 text-sm sm:text-base hover:bg-[#2d4e5b] transition-colors disabled:opacity-50"
                                                    onClick={() => createCommunityPost("friends", "Looking for a friend", "Hello! Looking to connect with a friend? Beautiful! Tell me all about it and we'll see what can be done. :)")}
                                                >
                                                    {creating === "friends" ? "Creating..." : "Find Friends"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {loading ? (
                                        <div className="p-4 sm:p-8 flex justify-center">
                                            <Loader loadingMessage="Loading community..." />
                                        </div>
                                    ) : error ? (
                                        <div className="p-4 sm:p-8 text-center text-red-600 text-sm sm:text-base">{error}</div>
                                    ) : (() => {
                                        const visibleRequirements = requirements.filter((r) => {
                                            if (r.role === "friends") return !!brand?.enableFriendConnect;
                                            if (r.role === "job_seeker" || r.role === "recruiter") return !!brand?.enableProfessionalConnect;
                                            return true;
                                        });
                                        return visibleRequirements.length === 0 ? (
                                            <div className="p-4 sm:p-8 text-center text-muted text-sm sm:text-base">
                                                No community posts yet.
                                            </div>
                                        ) : (
                                            <div className="py-4 px-4 sm:px-8 sm:py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                                {visibleRequirements.map((r) => (
                                                    <CommunityCard
                                                        key={r.id}
                                                        name={r.name}
                                                        date={r.date}
                                                        description={r.description}
                                                        requirement={r.requirement}
                                                        onConnect={() => handleConnect(user.id, r.userId, r.name)}
                                                        connectLabel={paidConnectedUserIds.has(String(r.userId)) ? "Message" : "Connect"}
                                                        isOwnPost={String(r.userId) === String(user?.id)}
                                                    />
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </>
                            )}
                        </div>
                    </div>
                    <PoweredByKavisha />
                </div>
            </div>
            {/* Connecting overlay: from Connect click until chat opens */}
            {connectingToUserId && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
                    <div className="flex flex-col items-center gap-3 rounded-xl bg-white/95 px-8 py-6 shadow-xl">
                        <div className="relative">
                            <div className="w-10 h-10 border-4 border-gray-200 rounded-full" />
                            <div className="absolute inset-0 w-10 h-10 border-4 border-transparent border-t-[#59646F] rounded-full animate-spin" />
                        </div>
                        <span className="text-[#59646F] text-sm font-medium">Connecting...</span>
                    </div>
                </div>
            )}
            {/* 1-on-1 chat overlay when Connect is clicked */}
            {openChat && chatUserA && chatUserB && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-4">
                    <div className="bg-background w-full sm:max-w-lg h-[85vh] sm:h-[80vh] max-h-[100vh] border border-border shadow-2xl flex flex-col overflow-hidden rounded-t-xl sm:rounded-xl">
                        <LiveChat
                            userA={chatUserA}
                            userB={chatUserB}
                            currentUserId={user?.id}
                            onClose={() => setOpenChat(false)}
                            connectionId={connectionId}
                            isEmbedded={true}
                            otherUserDisplayName={chatOtherDisplayName}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}