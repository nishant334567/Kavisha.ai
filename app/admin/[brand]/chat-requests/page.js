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

  const brandContext = useBrandContext();
  const { users, loading, filters, applyFilters, datePresets, servicesDropDown } = useChatRequests(brandContext);

  useEffect(() => {
    console.log("List of Emails:", emailList)
  }, [emailList])
  const handleAssignSuccess = () => {
    applyFilters(filters);
  };
  const [draftFilters, setDraftFilters] = useState(() => ({
    datePreset: "all",
    dateFrom: null,
    dateTo: null,
    serviceKey: "",
  }));

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
              className="text-gray-700 hover:opacity-70 transition-opacity shrink-0"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-zen text-[#004A4E] pb-1">
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
                    const allEmails = users.filter((u) => u?.email).map((u) => u.email);
                    setEmailList((prev) =>
                      prev.length === allEmails.length ? [] : allEmails
                    );
                  }}
                  className="px-4 py-2 rounded-lg border border-[#004A4E]/30 bg-white text-[#004A4E] text-sm font-medium hover:bg-[#004A4E]/5 transition-colors"
                >
                  {emailList.length === users.filter((u) => u?.email).length ? "Deselect all" : "Select all"}
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
        {/* Filter section */}
        <div className="rounded-xl border border-[#004A4E]/20 bg-[rgba(0,74,78,0.03)] p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#004A4E] uppercase tracking-wide">Date</label>
              <select
                value={draftFilters.datePreset}
                onChange={(e) =>
                  setDraftFilters((prev) => ({ ...prev, datePreset: e.target.value }))
                }
                className="border border-[#004A4E]/30 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#004A4E]/30 focus:border-[#004A4E] outline-none min-w-[140px]"
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
                  <label className="text-xs font-semibold text-gray-500">From</label>
                  <input
                    type="date"
                    value={draftFilters.dateFrom ?? ""}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                    }
                    className="border border-[#004A4E]/30 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#004A4E]/30 outline-none"
                  />
                </div>
                <span className="text-sm text-gray-400 pb-2">to</span>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500">To</label>
                  <input
                    type="date"
                    value={draftFilters.dateTo ?? ""}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                    }
                    className="border border-[#004A4E]/30 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#004A4E]/30 outline-none"
                  />
                </div>
              </>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#004A4E] uppercase tracking-wide">Service Type</label>
              <select
                value={draftFilters.serviceKey}
                onChange={(e) =>
                  setDraftFilters((prev) => ({ ...prev, serviceKey: e.target.value }))
                }
                className="border border-[#004A4E]/30 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#004A4E]/30 focus:border-[#004A4E] outline-none min-w-[160px]"
              >
                {servicesDropDown?.map((item, index) => (
                  <option key={item?._key} value={item?._key}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => applyFilters(draftFilters)}
              className="px-4 py-2 text-sm font-medium bg-[#004A4E] text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm"
            >
              Apply
            </button>
          </div>
        </div>
        <div className="w-full flex flex-col gap-4">
          {users.length > 0 ? (
            users.map((item, index) => (
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
            <div className="col-span-full text-center text-gray-500 py-8">
              No sessions found
            </div>
          )}
        </div>

        {showEmailModal && (
          <EmailModal
            onClose={() => setShowEmailModal(false)}
            toEmails={emailList}
            brand={brandContext?.subdomain}
          />
        )}

        {commentModalSessionId && (
          <CommentModal
            sessionId={commentModalSessionId}
            onClose={() => setCommentModalSessionId(null)}
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
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl h-[90vh] flex flex-col overflow-hidden">
              <div className="flex-shrink-0 flex justify-end p-2 border-b border-[#004A4E]/20 bg-[#004A4E]/5">
                <button type="button" onClick={() => setSessionViewSessionId(null)} className="p-2 rounded-lg hover:bg-[#004A4E]/10" aria-label="Close">
                  <X className="w-5 h-5 text-[#004A4E]" />
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
