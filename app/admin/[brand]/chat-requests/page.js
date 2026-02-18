"use client";

import { useState, useEffect } from "react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";
import UserCard from "@/app/admin/components/UserCard";
import AdminLogsModal from "@/app/admin/components/AdminLogsModal";
import CommentModal from "@/app/admin/components/CommentModal";
import AssignModal from "@/app/admin/components/AssignModal";
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
  const [sessionViewSessionId, setSessionViewSessionId] = useState(null);
  const [openChat, setOpenChat] = useState(false);
  const [userA, setUserA] = useState(null);
  const [userB, setUserB] = useState(null);
  const [connectionId, setConnectionId] = useState(null);

  const brandContext = useBrandContext();
  const { users, loading, filters, applyFilters, datePresets, servicesDropDown } = useChatRequests(brandContext);

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
      <div className="px-4 mt-4 gap-2">
        <button
          onClick={() => router.back()}
          className="text-black hover:opacity-70 transition-opacity"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3 justify-center md:justify-start">
          <h1 className="md:pl-32 text-3xl md:text-4xl font-zen text-[#000A67] mb-6 pb-2 inline-block">
            All Chat Requests
          </h1>
        </div>
      </div>
      <div className="w-full mx-auto px-2 lg:px-4">
        <div className="flex flex-wrap items-center gap-2 py-2 mb-4">
          <span className="text-sm font-medium">Date:</span>
          <select
            value={draftFilters.datePreset}
            onChange={(e) =>
              setDraftFilters((prev) => ({ ...prev, datePreset: e.target.value }))
            }
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {datePresets.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {draftFilters.datePreset === "custom" && (
            <>
              <input
                type="date"
                value={draftFilters.dateFrom ?? ""}
                onChange={(e) =>
                  setDraftFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                }
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <span className="text-sm text-gray-500">to</span>
              <input
                type="date"
                value={draftFilters.dateTo ?? ""}
                onChange={(e) =>
                  setDraftFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                }
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </>
          )}
          <label>Service Type</label>
          <select
            value={draftFilters.serviceKey}
            onChange={(e) =>
              setDraftFilters((prev) => ({ ...prev, serviceKey: e.target.value }))
            }
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {servicesDropDown?.map((item, index) => {
              return <option key={item?._key} value={item?._key}>
                {item.title}
              </option>
            })}
          </select>

          <button
            onClick={() => applyFilters(draftFilters)}
            className="px-3 py-1 text-sm bg-[#000A67] text-white rounded hover:opacity-90"
          >
            Apply
          </button>
        </div>
        <div className="w-full lg:w-[90%] min-w-0 mx-auto flex flex-col gap-4">
          {users.length > 0 ? (
            users.map((item, index) => (
              <div key={item.userId ?? index} className="min-w-0 w-full">
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
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500 py-8">
              No sessions found
            </div>
          )}
        </div>

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
              <div className="flex-shrink-0 flex justify-end p-2 border-b border-[#BFC4E5] bg-[#EEF0FE]">
                <button type="button" onClick={() => setSessionViewSessionId(null)} className="p-2 rounded-lg hover:bg-white/80" aria-label="Close">
                  <X className="w-5 h-5 text-[#42476D]" />
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
