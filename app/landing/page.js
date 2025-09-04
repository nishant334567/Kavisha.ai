"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import ChatBox from "@/app/components/ChatBox";

export default function Landing() {
  const { data: session } = useSession();
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentChatType, setCurrentChatType] = useState(null);
  const [showInbox, setShowInbox] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const startChat = async () => {
    // Open panel for everyone (unauthenticated demo allowed)
    setShowPanel(true);
    if (session?.user?.id) {
      try {
        const res = await fetch("/api/newchatsession", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.user.id,
            role: "job_seeker",
            brand: "kavisha",
            initialmessage: undefined,
          }),
        });
        const data = await res.json();
        if (data?.success && data?.sessionId) {
          setCurrentChatId(data.sessionId);
          setCurrentChatType("job_seeker");
        }
      } catch (e) {}
    }
  };

  return (
    <main className=" bg-white overflow-y-auto h-screen scrollbar-none">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 sm:grid-cols-2 items-start">
          <div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900">
              Sanjeev Bikhchandani
            </h1>
            <p className="mt-3 text-slate-700">
              Founder & Executive Vice Chairman, Info Edge (Naukri.com) · Padma
              Shri awardee
            </p>
            <p className="mt-4 text-slate-600 max-w-2xl">
              Indian entrepreneur best known for founding Info Edge, the parent
              of Naukri.com, 99acres, and Jeevansathi. Education: St. Stephen’s
              College (Delhi University), IIM Ahmedabad. Source: Wikipedia.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Organizations</p>
                <p className="text-sm text-slate-800 mt-1">
                  Info Edge · Naukri.com
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Awards</p>
                <p className="text-sm text-slate-800 mt-1">Padma Shri (2020)</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Education</p>
                <p className="text-sm text-slate-800 mt-1">
                  St. Stephen’s College · IIM Ahmedabad
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Links</p>
                <p className="text-sm mt-1">
                  <a
                    className="text-sky-700 hover:underline"
                    href="https://www.infoedge.in/"
                    target="_blank"
                  >
                    Info Edge
                  </a>
                  <span className="mx-2">·</span>
                  <a
                    className="text-sky-700 hover:underline"
                    href="https://en.wikipedia.org/wiki/Sanjeev_Bikhchandani"
                    target="_blank"
                  >
                    Wikipedia
                  </a>
                </p>
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button
                onClick={startChat}
                className="px-4 py-2 rounded-md bg-sky-700 text-white hover:bg-sky-600"
              >
                {session ? "Start chatting" : "Lets Talk"}
              </button>
              {/* <a
                href="#chat"
                className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Scroll to Chat
              </a> */}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Source: Wikipedia — Sanjeev Bikhchandani
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <img
                src="sb.jpeg"
                alt="Sanjeev Bikhchandani"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {showPanel && (
        <div className="fixed inset-0 z-50 flex justify-end items-stretch bg-black/30">
          <div className="relative h-full w-full max-w-[720px] bg-white border-l border-slate-200 shadow-xl">
            <button
              onClick={() => setShowPanel(false)}
              className="absolute top-3 right-3 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              aria-label="Close chat"
            >
              Close
            </button>
            <div className="h-full p-3">
              <ChatBox
                currentChatId={currentChatId}
                currentChatType={currentChatType}
                updateChatId={setCurrentChatId}
                openDetailsPanel={() => {}}
                toggleRightPanel={() => {}}
                showInbox={showInbox}
                setShowInbox={setShowInbox}
              />
              {!session?.user?.id && !currentChatId && (
                <div className="mt-3 text-center text-xs text-slate-500">
                  You can explore the chat UI here. Sign in to start a session.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
