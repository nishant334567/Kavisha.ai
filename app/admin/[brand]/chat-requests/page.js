"use client";

import { useState, useEffect } from "react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft, X, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import UserCard from "@/app/admin/components/UserCard";
import AdminLogsModal from "@/app/admin/components/AdminLogsModal";
import CommentModal from "@/app/admin/components/CommentModal";
import AssignModal from "@/app/admin/components/AssignModal";
import EmailModal from "@/app/admin/components/EmailModal";
import AdminChatSessionView from "@/app/admin/components/AdminChatSessionView";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import Livechat from "@/app/components/LiveChat";
import Loader from "@/app/components/Loader";
import { useChatRequests } from "./hooks/useChatRequests";

export default function ChatRequests() {
  const router = useRouter();
  const { user } = useFirebaseSession();
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedSessionLogs, setSelectedSessionLogs] = useState(null);
  const [commentModalSessionId, setCommentModalSessionId] = useState(null);
  const [assignModalSession, setAssignModalSession] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [sessionViewSessionId, setSessionViewSessionId] = useState(null);
  const [openChat, setOpenChat] = useState(false);
  const [userA, setUserA] = useState(null);
  const [userB, setUserB] = useState(null);
  const [connectionId, setConnectionId] = useState(null);
  const [showSelect, setShowSelect] = useState(false);
  const [emailList, setEmailList] = useState([]);
  const [pageTitle, setPageTitle] = useState("All Chat Requests");
  const [pageSubtitle, setPageSubtitle] = useState("");
  const brandContext = useBrandContext();
  const { users, total, loading, filters, applyFilters, datePresets, messageCountOptions, sessionCountOptions, emailSentOptions, lastEmailOptions, servicesDropDown } = useChatRequests(brandContext);

  const [activeTab, setActiveTab] = useState("");

  const displayedUsers = activeTab === ""
    ? users
    : users.filter((u) => u.sessions?.some((s) => s.serviceKey === activeTab));

  const tabCount = (key) =>
    key === "" ? users.length : users.filter((u) => u.sessions?.some((s) => s.serviceKey === key)).length;


  const handleAssignSuccess = () => {
    applyFilters(filters);
  };
  const [draftFilters, setDraftFilters] = useState(() => ({
    datePreset: "all",
    dateFrom: null,
    dateTo: null,
    minMessages: "all",
    minSessions: "all",
    minEmailsSent: "all",
    lastEmailPreset: "all",
    lastEmailFrom: null,
    lastEmailTo: null,
  }));

  useEffect(() => {
    setDraftFilters((prev) => ({
      ...prev,
      datePreset: filters.datePreset ?? prev.datePreset,
      dateFrom: filters.dateFrom ?? prev.dateFrom,
      dateTo: filters.dateTo ?? prev.dateTo,
      minMessages: filters.minMessages ?? prev.minMessages,
      minSessions: filters.minSessions ?? prev.minSessions,
      minEmailsSent: filters.minEmailsSent ?? prev.minEmailsSent,
      lastEmailPreset: filters.lastEmailPreset ?? prev.lastEmailPreset,
      lastEmailFrom: filters.lastEmailFrom ?? prev.lastEmailFrom,
      lastEmailTo: filters.lastEmailTo ?? prev.lastEmailTo,
    }));
  }, [filters.datePreset, filters.dateFrom, filters.dateTo, filters.minMessages, filters.minSessions, filters.minEmailsSent, filters.lastEmailPreset, filters.lastEmailFrom, filters.lastEmailTo]);

  const openChatSession = (userA, userB) => {
    setUserA(userA);
    setUserB(userB);
    setConnectionId([userA, userB].sort().join("_"));
    setOpenChat((prev) => !prev);
  };

  useEffect(() => {
    if (sessionViewSessionId) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [sessionViewSessionId]);

  if (loading) {
    return <Loader loadingMessage="Loading chat requests..." />;
  }

  return (
    <div>
      <div className="w-full lg:w-[90%] min-w-0 mx-auto px-4 sm:px-6 mt-4">


        {/* Header: back + title left; Send email top right */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => router.back()}
              className="shrink-0 text-foreground transition-opacity hover:opacity-70"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="pb-1 font-baloo text-2xl text-highlight sm:text-3xl md:text-4xl">
              All Chat Requests
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowSelect((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#004A4E] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Mail className="w-4 h-4" />
              {showSelect ? "Cancel" : "Send email"}
            </button>
            {showSelect && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const allEmails = displayedUsers.filter((u) => u?.email).map((u) => u.email);
                    setEmailList((prev) =>
                      prev.length === allEmails.length ? [] : allEmails
                    );
                  }}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-highlight transition-colors hover:bg-muted-bg"
                >
                  {emailList.length === displayedUsers.filter((u) => u?.email).length ? "Deselect all" : "Select all"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailModal(true);
                    setShowSelect(false);
                  }}
                  disabled={emailList.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#004A4E] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  Send to {emailList.length} user{emailList.length !== 1 ? "s" : ""}
                </button>
              </>
            )}
          </div>
        </div>
        {/* Service tabs */}
        {servicesDropDown.length > 0 && (
          <div className="mb-6 flex items-end justify-center gap-0 border-b border-border">
            {[{ _key: "", title: "ALL" }, ...servicesDropDown].map((tab) => {
              const count = tabCount(tab._key);
              const isActive = activeTab === tab._key;
              const tabUsers = tab._key === ""
                ? users
                : users.filter((u) => u.sessions?.some((s) => s.serviceKey === tab._key));
              const tabPeople = tabUsers.length;
              const tabChats = tabUsers.reduce((acc, u) => acc + (u.sessions?.length ?? 0), 0);
              const tabQuestions = tabUsers.reduce(
                (acc, u) => acc + (u.sessions?.reduce((sacc, s) => sacc + (s.messageCount ?? 0), 0) ?? 0), 0
              );
              return (
                <div key={tab._key} className="relative group">
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab._key)}
                    className={`relative flex items-center gap-2 px-5 pb-3 pt-1 text-sm transition-all whitespace-nowrap ${isActive
                      ? "font-semibold text-highlight"
                      : "font-medium text-muted hover:text-foreground"
                      }`}
                  >
                    {tab.title}
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isActive
                        ? "bg-[#004A4E] text-white"
                        : "bg-muted-bg text-muted"
                        }`}
                    >
                      {count}
                    </span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#004A4E] rounded-full" />
                    )}
                  </button>
                  {/* Hover analytics popover */}
                  <div className="absolute top-full left-1/2 z-50 mt-2 w-56 -translate-x-1/2 rounded-xl border border-border bg-card px-4 py-3 shadow-lg pointer-events-none opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <p className="mb-2 text-xs font-semibold text-highlight">{tab.title} analytics</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted">
                        <span>Total people</span>
                        <span className="font-semibold text-muted">{tabPeople}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted">
                        <span>Total chats</span>
                        <span className="font-semibold text-muted">{tabChats}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted">
                        <span>Total questions</span>
                        <span className="font-semibold text-muted">{tabQuestions}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filter section */}
        <div className="mb-6 rounded-xl border border-border bg-muted-bg p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-highlight">Date</label>
              <select
                value={draftFilters.datePreset}
                onChange={(e) =>
                  setDraftFilters((prev) => ({ ...prev, datePreset: e.target.value }))
                }
                className="min-w-[140px] rounded-lg border border-border bg-input px-3 py-2 text-sm text-muted outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                {datePresets.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            {draftFilters.datePreset === "custom" && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted">From</label>
                  <input
                    type="date"
                    value={draftFilters.dateFrom ?? ""}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                    }
                    className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-muted outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <span className="pb-2 text-sm text-muted">to</span>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted">To</label>
                  <input
                    type="date"
                    value={draftFilters.dateTo ?? ""}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                    }
                    className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-muted outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              </>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-highlight">Total messages</label>
              <select
                value={draftFilters.minMessages ?? "all"}
                onChange={(e) =>
                  setDraftFilters((prev) => ({ ...prev, minMessages: e.target.value }))
                }
                className="min-w-[140px] rounded-lg border border-border bg-input px-3 py-2 text-sm text-muted outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                {messageCountOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-highlight">Chat sessions</label>
              <select
                value={draftFilters.minSessions ?? "all"}
                onChange={(e) =>
                  setDraftFilters((prev) => ({ ...prev, minSessions: e.target.value }))
                }
                className="min-w-[140px] rounded-lg border border-border bg-input px-3 py-2 text-sm text-muted outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                {sessionCountOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-highlight">Total emails sent</label>
              <select
                value={draftFilters.minEmailsSent ?? "all"}
                onChange={(e) =>
                  setDraftFilters((prev) => ({ ...prev, minEmailsSent: e.target.value }))
                }
                className="min-w-[140px] rounded-lg border border-border bg-input px-3 py-2 text-sm text-muted outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                {emailSentOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-highlight">Last email sent</label>
              <select
                value={draftFilters.lastEmailPreset ?? "all"}
                onChange={(e) =>
                  setDraftFilters((prev) => ({ ...prev, lastEmailPreset: e.target.value }))
                }
                className="min-w-[160px] rounded-lg border border-border bg-input px-3 py-2 text-sm text-muted outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                {lastEmailOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {draftFilters.lastEmailPreset === "custom" && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted">Last email from</label>
                  <input
                    type="date"
                    value={draftFilters.lastEmailFrom ?? ""}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({ ...prev, lastEmailFrom: e.target.value }))
                    }
                    className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-muted outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <span className="pb-2 text-sm text-muted">to</span>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted">Last email to</label>
                  <input
                    type="date"
                    value={draftFilters.lastEmailTo ?? ""}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({ ...prev, lastEmailTo: e.target.value }))
                    }
                    className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-muted outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              </>
            )}
            <button
              onClick={() => applyFilters(draftFilters)}
              className="px-4 py-2 text-sm font-medium bg-[#004A4E] text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm"
            >
              Apply
            </button>
          </div>
        </div>
        <div className="w-full flex flex-col gap-4">
          {displayedUsers.length > 0 ? (
            displayedUsers.map((item, index) => (
              <div key={item.userId ?? index} className="w-full flex items-stretch gap-2">
                {showSelect && (
                  <input
                    type="checkbox"
                    checked={item?.email && emailList.includes(item.email)}
                    onChange={() => {
                      if (!item?.email) return;
                      setEmailList((prev) =>
                        prev.includes(item.email)
                          ? prev.filter((e) => e !== item.email)
                          : [...prev, item.email]
                      );
                    }}
                    className="mt-3 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <UserCard
                    user={item}
                    setSelectedSessionLogs={setSelectedSessionLogs}
                    setShowLogsModal={setShowLogsModal}
                    openChatSession={openChatSession}
                    onOpenSessionView={setSessionViewSessionId}
                    onOpenComments={setCommentModalSessionId}
                    onOpenAssign={setAssignModalSession}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-8 text-center text-muted">
              No sessions found
            </div>
          )}
        </div>

        {showEmailModal && (
          <EmailModal
            onClose={() => setShowEmailModal(false)}
            toEmails={displayedUsers
              .filter((u) => u?.email && emailList.includes(u.email))
              .map((u) => ({
                email: u.email,
                name: u.name ?? u.email,
                lastEmail: u.sessions?.[0]?.updatedAt ?? null,
              }))}
            brand={brandContext?.subdomain}
            logoUrl={brandContext?.logoUrl}
          />
        )}


        {commentModalSessionId && (
          <CommentModal
            sessionId={commentModalSessionId}
            onClose={() => setCommentModalSessionId(null)}
            onCommentAdded={() => applyFilters(filters)}
          />
        )}

        {assignModalSession && (
          <AssignModal
            sessionId={assignModalSession.sessionId}
            brandSubdomain={brandContext?.subdomain}
            currentAssignedTo={assignModalSession.assignedTo}
            onClose={() => setAssignModalSession(null)}
            onSuccess={handleAssignSuccess}
          />
        )}

        {showLogsModal && selectedSessionLogs && (
          <AdminLogsModal
            selectedSessionLogs={selectedSessionLogs}
            setShowLogsModal={setShowLogsModal}
            setSelectedSessionLogs={setSelectedSessionLogs}
            brand={brandContext?.subdomain}
          />
        )}

        {sessionViewSessionId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-hidden"
            onClick={(e) => e.target === e.currentTarget && setSessionViewSessionId(null)}
          >
            <div className="flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
              <div className="flex flex-shrink-0 justify-end border-b border-border bg-muted-bg p-2">
                <button type="button" onClick={() => setSessionViewSessionId(null)} className="rounded-lg p-2 hover:bg-background/70" aria-label="Close">
                  <X className="w-5 h-5 text-highlight" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <AdminChatSessionView sessionId={sessionViewSessionId} />
              </div>
            </div>
          </div>
        )}

        {openChat && userA && userB && (
          <Livechat
            userA={userA}
            userB={userB}
            currentUserId={user?.id}
            onClose={() => setOpenChat(false)}
            connectionId={connectionId}
          />
        )}
      </div>
    </div>
  );
}
