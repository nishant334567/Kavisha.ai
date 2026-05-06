"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";

function ensureRazorpayLoaded() {
  if (typeof window === "undefined" || window.Razorpay)
    return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load payment"));
    document.body.appendChild(s);
  });
}

/**
 * Paid-connection list + Razorpay community_connect flow + open chat (same as /postings).
 */
export function useCommunityConnect({ user, brandSubdomain, openChatSession }) {
  const openChatRef = useRef(openChatSession);
  useEffect(() => {
    openChatRef.current = openChatSession;
  }, [openChatSession]);

  const [paidConnectionUserIds, setPaidConnectionUserIds] = useState([]);
  const [connectingToUserId, setConnectingToUserId] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      setPaidConnectionUserIds([]);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/community/paid-connections", {
          credentials: "include",
        });
        const data = await res.json();
        setPaidConnectionUserIds(
          Array.isArray(data?.paidTargetUserIds) ? data.paidTargetUserIds : [],
        );
      } catch {
        setPaidConnectionUserIds([]);
      }
    })();
  }, [user?.id]);

  const paidConnectedUserIds = useMemo(
    () =>
      new Set(
        (paidConnectionUserIds || []).map((id) => String(id)).filter(Boolean),
      ),
    [paidConnectionUserIds],
  );

  const refetchPaidConnections = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch("/api/community/paid-connections", {
        credentials: "include",
      });
      const data = await res.json();
      setPaidConnectionUserIds(
        Array.isArray(data?.paidTargetUserIds) ? data.paidTargetUserIds : [],
      );
    } catch {
      setPaidConnectionUserIds([]);
    }
  }, [user?.id]);

  const initiatePayment = useCallback(
    async (thisUser, otherUser, onSuccess) => {
      if (paidConnectedUserIds.has(String(otherUser))) {
        openChatRef.current?.(thisUser, otherUser);
        setConnectingToUserId(null);
        return;
      }
      try {
        const res = await fetch("/api/razorpay/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId: thisUser, targetUserId: otherUser }),
        });
        const data = await res.json();
        if (!data?.orderId)
          throw new Error(data?.error || "Failed to create order");

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
                metadata: {
                  targetUserId: otherUser,
                  brand: brandSubdomain || "",
                },
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
    },
    [paidConnectedUserIds, user?.email, brandSubdomain],
  );

  const handleConnect = useCallback(
    (userA, userB, otherDisplayName = null) => {
      setConnectingToUserId(String(userB));
      if (paidConnectedUserIds.has(String(userB))) {
        openChatRef.current?.(userA, userB, otherDisplayName);
        setConnectingToUserId(null);
        return;
      }
      initiatePayment(userA, userB, () => {
        refetchPaidConnections();
        openChatRef.current?.(userA, userB, otherDisplayName);
        setConnectingToUserId(null);
      });
    },
    [paidConnectedUserIds, initiatePayment, refetchPaidConnections],
  );

  return {
    paidConnectedUserIds,
    handleConnect,
    connectingToUserId,
    refetchPaidConnections,
  };
}
