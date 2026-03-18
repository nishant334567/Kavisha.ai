"use client";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { useState, useEffect, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import SelectChatType from "../components/SelectType";
import ChatSidebar from "../components/ChatSidebar";
import Loader from "../components/Loader";
import Homepage from "../components/Homepage";
import AvatarHomepage from "../components/AvatarHomepage";
import PoweredByKavisha from "../components/PoweredByKavisha";
import { ArrowRight, ArrowLeft } from "lucide-react";

export default function HomePage() {
    const { user, loading } = useFirebaseSession();
    const router = useRouter()
    const [currentChatType, setCurrentChatType] = useState(null);
    const brandContext = useBrandContext();

    const [currentChatId, setCurrentChatId] = useState(null);
    const [allChats, setAllchats] = useState(null);
    const [creatingSession, setCreatingSession] = useState(false);
    const [creatingForServiceKey, setCreatingForServiceKey] = useState(null);
    const [showInbox, setShowInbox] = useState(false);
    const [servicesProvided, setServicesProvided] = useState({});
    const [servicesWithStats, setServicesWithStats] = useState([]);
    const [loadingServicesWithStats, setLoadingServicesWithStats] = useState(true);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);



    useLayoutEffect(() => {
        if (loading || !user || !brandContext) {
            return;
        }
        const redirectPath = typeof window !== "undefined" ? localStorage.getItem("redirectAfterLogin") : null;

        if (redirectPath) {
            // Validate that redirectPath is a valid string path
            const path = typeof redirectPath === "string" && redirectPath.startsWith("/")
                ? redirectPath
                : null;

            if (path) {
                localStorage.removeItem("redirectAfterLogin");
                router.replace(path);
                return;
            } else {
                // Clean up invalid redirect path
                localStorage.removeItem("redirectAfterLogin");
            }
        }
    }, [user, loading, brandContext, router]);


    // Do not restore previous chat on /chats – show only cards; history is in the left sidebar.

    useEffect(() => {
        if (!brandContext) return;
        let filteredServices = brandContext.services || [];

        if (brandContext.subdomain !== "kavisha") {
            if (brandContext.isBrandAdmin) {
                filteredServices = filteredServices.filter(
                    (service) => service.name?.toLowerCase() === "recruiter"
                );
            } else {
                filteredServices = filteredServices.filter(
                    (service) => service.name?.toLowerCase() !== "recruiter"
                );
            }
        }

        setServicesProvided(filteredServices);
    }, [brandContext]);
    useEffect(() => {
        if (!user || !brandContext) return;
        const fetchData = async () => {
            const endpoint =
                brandContext.subdomain === "kavisha"
                    ? "/api/allchats"
                    : `/api/allchats/${brandContext.subdomain}`;
            const res = await fetch(endpoint);
            const data = await res.json();
            setAllchats(data);
        };
        fetchData();
    }, [user, brandContext]);

    useEffect(() => {
        if (!user || !brandContext) return;
        setLoadingServicesWithStats(true);
        fetch(
            `/api/chat-services-stats?brand=${encodeURIComponent(brandContext.subdomain)}`,
            { credentials: "include" }
        )
            .then((res) => res.json())
            .then((data) => {
                const list = Array.isArray(data?.services) ? data.services : [];
                let filtered = list;
                if (brandContext.subdomain !== "kavisha") {
                    if (brandContext.isBrandAdmin) {
                        filtered = list.filter(
                            (s) => s.name?.toLowerCase() === "recruiter"
                        );
                    } else {
                        filtered = list.filter(
                            (s) => s.name?.toLowerCase() !== "recruiter"
                        );
                    }
                }
                setServicesWithStats(filtered);
            })
            .catch(() => setServicesWithStats([]))
            .finally(() => setLoadingServicesWithStats(false));
    }, [user, brandContext]);

    const selectChatType = async (
        type,
        initialMessage,
        isCommunityChat = false,
        name,
        serviceKey
    ) => {
        setCurrentChatType(type);
        setCreatingForServiceKey(serviceKey || null);
        if (!user || !brandContext) {
            setCreatingForServiceKey(null);
            return;
        }

        try {
            setCreatingSession(true);
            const res = await fetch("/api/newchatsession", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.id,
                    role: type,
                    brand: brandContext.subdomain,
                    initialmessage: initialMessage,
                    isCommunityChat: isCommunityChat,
                    chatName: name,
                    ...(serviceKey && { serviceKey }),
                }),
            });
            const data = await res.json();
            if (data?.success && data?.sessionId) {
                // Go to chat page; /chats always shows cards only
                router.push(`/chats/${data.sessionId}`);
            }
        } catch (e) {
            console.error("Error creating chat session:", e);
        } finally {
            setCreatingSession(false);
            setCreatingForServiceKey(null);
        }
    };

    useEffect(() => {
        if (user && brandContext?.isBrandAdmin) {
            router.push(`/admin/${brandContext.subdomain}/v2`);
        }
    }, [user, brandContext, router]);

    if (loading) {
        return <Loader loadingMessage="Loading..." />;
    }

    if (!user) {
        if (!brandContext) {
            return <Loader loadingMessage="Loading..." />;
        }
        if (brandContext.subdomain === "kavisha") {
            return <Homepage />;
        }
        return <AvatarHomepage />;
    }

    // Don't render chat interface for admins (they'll be redirected)
    if (brandContext?.isBrandAdmin) {
        return <Loader loadingMessage="Redirecting to admin dashboard..." />;
    }

    return (
        <div className="min-h-[calc(100vh-64px)] h-[calc(100vh-64px)] flex flex-col overflow-hidden">
            <div className="flex flex-1 min-h-0 overflow-hidden">
                <div>
                    <ChatSidebar
                        allChats={allChats}
                        updateChatId={setCurrentChatId}
                        currentChatId={currentChatId}
                        currentChatType={currentChatType}
                        setCurrentChatType={setCurrentChatType}
                        onOpenInbox={() => setShowInbox(true)}
                        onCollapsedChange={setIsSidebarCollapsed}
                        servicesProvided={servicesProvided}
                        onSelectService={selectChatType}
                        isCreatingSession={creatingSession}
                        defaultCollapsed={true}
                        homePath="/chats"
                        openRequest={!isSidebarCollapsed}
                    />
                </div>

                <div className="w-full h-full flex flex-col overflow-hidden pt-28 md:pt-0">
                    <SelectChatType
                        servicesWithStats={servicesWithStats}
                        userDisplayName={user?.displayName || user?.name || "there"}
                        selectChatType={selectChatType}
                        isCreating={creatingSession}
                        creatingForServiceKey={creatingForServiceKey}
                        loading={loadingServicesWithStats}
                    />
                    <div className="w-full max-w-2xl mx-auto px-4 pt-4 pb-8">
                        <button
                            type="button"
                            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                            className="inline-flex items-center gap-1.5 text-[#00888E] hover:underline font-medium text-sm"
                        >
                            {isSidebarCollapsed ? (
                                <>
                                    Your chats
                                    <ArrowRight className="w-4 h-4 shrink-0" />
                                </>
                            ) : (
                                <>
                                    <ArrowLeft className="w-4 h-4 shrink-0" />
                                    Close
                                </>
                            )}
                        </button>
                    </div>
                    {/* Chat UI only at /chats/[id]; this page always shows cards only */}
                </div>
            </div>
            <PoweredByKavisha />
        </div>
    );
}
