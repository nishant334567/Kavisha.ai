"use client";

import { useEffect, useState } from "react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import UserCard from "@/app/admin/components/UserCard";
import AdminLogsModal from "@/app/admin/components/AdminLogsModal";
import EmailModal from "@/app/admin/components/EmailModal";
import AlertModal from "@/app/admin/components/AlertModal";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import Livechat from "@/app/components/LiveChat";
import Loader from "@/app/components/Loader";

function AnalyticsHoverCard({ title, people, chats, questions }) {
  return (
    <div className="absolute left-0 top-full mt-1 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-100 z-50">
      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-xl min-w-[220px]">
        <p className="font-akshar font-semibold text-[#000A67] mb-3 text-sm">{title}</p>
        <p className="text-xs text-gray-600">Total number of people: {people}</p>
        <p className="text-xs text-gray-600">Total number of chats: {chats}</p>
        <p className="text-xs text-gray-600">Total number of questions: {questions}</p>
      </div>
    </div>
  );
}

export default function ChatRequests() {
  const router = useRouter();
  const { user } = useFirebaseSession();
  const [sessionData, setSessionData] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [selectedService, setSelectedService] = useState("all"); // "all" | service _key
  const brandContext = useBrandContext();
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedSessionLogs, setSelectedSessionLogs] = useState(null);
  const [openChat, setOpenChat] = useState(false);
  const [userA, setUserA] = useState(null);
  const [userB, setUserB] = useState(null);
  const [connectionId, setConnectionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailSelectionMode, setEmailSelectionMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ subject: "", body: "" });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResults, setEmailResults] = useState(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  useEffect(() => {
    const fetchChatRequests = async () => {
      if (!brandContext?.subdomain) return;
      setLoading(true);
      try {
        const response = await fetch(
          `/api/admin/fetch-sessions?brand=${brandContext?.subdomain}&type=normal`
        );
        const data = await response.json();
        if (data.success) {
          setAllSessions(data.users);
          setSelectedService("all");
          setSessionData(data.users);
        } else {
          setSessionData([]);
          setAllSessions([]);
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
        setSessionData([]);
        setAllSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChatRequests();
  }, [brandContext?.subdomain]);

  // Filter by service _key (session.serviceKey). "All" = no filter = all sessions (including serviceKey null / remaining).
  const getSessionCount = (service) => {
    if (!service)
      return allSessions.reduce((sum, user) => sum + user.sessions.length, 0);
    const key = service._key ?? service;
    return allSessions.reduce(
      (sum, user) =>
        sum + user.sessions.filter((s) => s.serviceKey === key).length,
      0
    );
  };

  const getPeopleCount = (service) => {
    if (!service) return allSessions.length;
    const key = service._key ?? service;
    return allSessions.filter((u) =>
      u.sessions.some((s) => s.serviceKey === key)
    ).length;
  };

  const getQuestionCount = (service) => {
    const sumMessages = (users) =>
      users.reduce(
        (sum, u) =>
          sum + u.sessions.reduce((s, sess) => s + (sess.messageCount || 0), 0),
        0
      );
    if (!service) return sumMessages(allSessions);
    const key = service._key ?? service;
    const filtered = allSessions.map((u) => ({
      ...u,
      sessions: u.sessions.filter((s) => s.serviceKey === key),
    })).filter((u) => u.sessions.length > 0);
    return sumMessages(filtered);
  };

  const filterSessions = (service) => {
    if (!service || service === "all") {
      setSelectedService("all");
      setSessionData(allSessions); // All = every session (remaining + keyed)
      return;
    }
    const key = service._key ?? service;
    setSelectedService(key);
    const filtered = allSessions
      .map((user) => ({
        ...user,
        sessions: user.sessions.filter((s) => s.serviceKey === key),
      }))
      .filter((user) => user.sessions.length > 0);
    setSessionData(filtered);
  };

  const openChatSession = (userA, userB) => {
    setUserA(userA);
    setUserB(userB);
    setConnectionId([userA, userB].sort().join("_"));
    setOpenChat((prev) => !prev);
  };

  const toggleUserSelection = (userId) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const selectAllUsers = () => {
    const selectableIds = sessionData
      .filter((u) => u.email)
      .map((u) => u.userId);
    const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedUserIds.has(id));
    setSelectedUserIds(allSelected ? new Set() : new Set(selectableIds));
  };

  const getSelectedRecipients = () =>
    sessionData
      .filter((u) => selectedUserIds.has(u.userId) && u.email)
      .map((u) => ({ email: u.email, name: u.name }));

  const handleSendEmail = async () => {
    if (!emailData.subject.trim() || !emailData.body.trim()) {
      alert("Please enter both subject and body");
      return;
    }
    const recipients = getSelectedRecipients();
    if (recipients.length === 0) {
      alert("No recipients selected or no valid email addresses");
      return;
    }
    setSendingEmail(true);
    try {
      const response = await fetch("/api/admin/send-bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients,
          subject: emailData.subject,
          body: emailData.body,
          brand: brandContext?.subdomain || "",
        }),
      });
      const result = await response.json();
      setEmailResults(result);
      if (result.success) {
        setShowEmailModal(false);
        setEmailData({ subject: "", body: "" });
        setShowSuccessAlert(true);
      }
    } catch (error) {
      alert("Failed to send emails. Please try again.");
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return <Loader loadingMessage="Loading chat requests..." />;
  }

  return (
    <div>
      <div className="px-4 mt-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="text-black hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl md:text-4xl font-zen text-[#000A67] pb-2">
            All Chat Requests
          </h1>
        </div>
        {sessionData.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                setEmailSelectionMode((prev) => !prev);
                if (emailSelectionMode) setSelectedUserIds(new Set());
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${emailSelectionMode
                ? "bg-[#000A67] text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
            >
              <Mail className="w-4 h-4" />
              Send email
            </button>
            {emailSelectionMode && (
              <>
                <button
                  onClick={selectAllUsers}
                  className="px-3 py-1.5 rounded-lg text-sm bg-[#EEF0FE] text-[#000A67] hover:bg-[#BFC4E5] transition-colors"
                >
                  Select all
                </button>
                <button
                  onClick={() => {
                    const count = getSelectedRecipients().length;
                    if (count === 0) {
                      alert("Select at least one user with a valid email");
                      return;
                    }
                    setShowEmailModal(true);
                  }}
                  disabled={getSelectedRecipients().length === 0}
                  className="px-3 py-1.5 rounded-lg text-sm bg-[#7981C2] text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Compose to {getSelectedRecipients().length} selected
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="w-full sm:w-[85%] mx-auto md:px-6">
        {/* <div className="flex items-center justify-between mb-8"> */}
        {/* <div className="flex-1"></div> */}
        <div className="grid grid-cols-2 md:flex items-center justify-center gap-y-4 md:gap-y-0 px-6 my-4">
          <div className="flex items-center relative group">
            <button
              onClick={() => filterSessions("all")}
              className={`font-akshar uppercase text-lg md:text-xl tracking-wide transition-colors relative ${selectedService === "all" ? "text-blue-600" : "text-black"
                }`}
            >
              All
              {getSessionCount(null) > 0 && (
                <span className="absolute -top-2 -right-6 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {getSessionCount(null)}
                </span>
              )}
            </button>
            <AnalyticsHoverCard
              title="All analytics"
              people={getPeopleCount(null)}
              chats={getSessionCount(null)}
              questions={getQuestionCount(null)}
            />
            {brandContext?.services?.length > 0 && (
              <div className="hidden lg:block lg:w-px lg:h-6 lg:bg-gray-300 mx-8"></div>
            )}
          </div>
          {brandContext?.services?.map((item, index) => {
            const count = getSessionCount(item);
            const isLast = index === brandContext.services.length - 1;
            const isSelected = selectedService === (item?._key ?? item?.name);
            const analyticsTitle = `${item?.title || item?.name} analytics`;
            return (
              <div key={item?._key ?? index} className="flex items-center relative group">
                <button
                  onClick={() => filterSessions(item)}
                  className={`font-akshar uppercase text-lg md:text-xl tracking-wide transition-colors relative ${isSelected ? "text-blue-600" : "text-black"
                    }`}
                >
                  {item?.title}
                  {count > 0 && (
                    <span className="absolute -top-2 -right-6 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                      {count}
                    </span>
                  )}
                </button>
                <AnalyticsHoverCard
                  title={analyticsTitle}
                  people={getPeopleCount(item)}
                  chats={getSessionCount(item)}
                  questions={getQuestionCount(item)}
                />
                {!isLast && (
                  <div className="hidden lg:block lg:w-px lg:h-6 lg:bg-gray-300 mx-8"></div>
                )}
              </div>
            );
          })}
        </div>
        {/* </div> */}

        <div>
          {sessionData.length > 0 ? (
            sessionData.map((item, index) => {
              const userId = item.userId ?? index;
              const isSelected = selectedUserIds.has(userId);
              return (
                <div key={userId} className="flex items-start gap-3 w-full min-w-0">
                  {emailSelectionMode && (
                    <label className="flex-shrink-0 pt-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleUserSelection(userId)}
                        className="w-4 h-4 rounded border-gray-300 text-[#7981C2] focus:ring-[#7981C2]"
                        disabled={!item.email}
                        title={item.email ? "Select for email" : "No email address"}
                      />
                    </label>
                  )}
                  <div className="flex-1 min-w-0">
                    <UserCard
                      user={item}
                      setSelectedSessionLogs={setSelectedSessionLogs}
                      setShowLogsModal={setShowLogsModal}
                      openChatSession={openChatSession}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center text-gray-500 py-8">
              No sessions found
            </div>
          )}
        </div>

        {showLogsModal && selectedSessionLogs && (
          <AdminLogsModal
            selectedSessionLogs={selectedSessionLogs}
            setShowLogsModal={setShowLogsModal}
            setSelectedSessionLogs={setSelectedSessionLogs}
            brand={brandContext?.subdomain}
          />
        )}

        {/* Success Alert Modal */}
        {showSuccessAlert && (
          <AlertModal
            message="Successfully sent email"
            onClose={() => {
              setShowSuccessAlert(false);
              setEmailSelectionMode(false);
              setSelectedUserIds(new Set());
              setEmailData({ subject: "", body: "" });
              setEmailResults(null);
            }}
          />
        )}

        {/* Email Modal */}
        {showEmailModal && (
          <EmailModal
            recipients={getSelectedRecipients()}
            emailData={emailData}
            setEmailData={setEmailData}
            onSend={handleSendEmail}
            sending={sendingEmail}
            onClose={() => {
              setShowEmailModal(false);
              setEmailData({ subject: "", body: "" });
              setEmailResults(null);
            }}
            emailResults={emailResults}
          />
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
