import { useSession } from "next-auth/react";
import { useState, useRef } from "react";

export default function MatchCard({ subtitle, matchedName, matchedEmail }) {
  const { data: session } = useSession();
  const [show, setShow] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const btnRef = useRef(null);
  const sendEmail = async () => {
    if (emailSent) return;
    try {
      const res = await fetch("/api/resend", {
        method: "POST",
        body: JSON.stringify({
          toEmail: matchedEmail,
          toName: matchedName,
          senderName: session?.user?.name || "",
        }),
      });
      if (res.ok) {
        setEmailSent(true);
      } else {
        setEmailSent(false);
      }
    } catch {
      setEmailSent(false);
    }
  };
  return (
    <div className="bg-white border border-emerald-100 rounded-xl shadow-lg p-6 mb-5 flex flex-col gap-3 relative transition hover:shadow-2xl">
      <p className="text-emerald-600 text-base font-medium mb-2">{subtitle}</p>
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => {
            setShow((prev) => !prev);
            sendEmail(); // fire and forget, don't await
          }}
          className="px-5 py-2 bg-emerald-400 text-white rounded-lg font-semibold shadow hover:bg-emerald-500 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          View Profile
        </button>
        {emailSent && (
          <p className="text-xs text-emerald-600 mt-2">
            An email has been sent to the match about your interest.
          </p>
        )}
        {show && (
          <div className="absolute left-0 mt-2 w-64 bg-white border border-emerald-100 rounded-xl shadow-xl p-5 z-20">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-emerald-700">
                Match Details
              </h3>
              <button
                onClick={() => {
                  setShow(false);
                  setEmailSent(false);
                }}
                className="text-gray-400 hover:text-rose-500 text-xl font-bold focus:outline-none"
                aria-label="Close profile details"
              >
                &times;
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-base font-semibold text-gray-800">
                {matchedName}
              </p>
              <p className="text-sm text-emerald-500">{matchedEmail}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
