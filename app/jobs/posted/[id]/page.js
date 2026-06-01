"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ChatBox from "@/app/components/ChatBox";
import Loader from "@/app/components/Loader";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { signIn } from "@/app/lib/firebase/sign-in";

export default function JobsPostedChatPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id ? String(params.id) : "";
  const brandContext = useBrandContext();
  const brand = brandContext?.subdomain;
  const { user, loading: authLoading } = useFirebaseSession();
  const [allowed, setAllowed] = useState(null);

  const qs = useMemo(
    () => (brand ? `?subdomain=${encodeURIComponent(brand)}` : ""),
    [brand]
  );

  useEffect(() => {
    if (!sessionId || !brand) {
      setAllowed(false);
      return;
    }
    if (!user?.id) {
      setAllowed(null);
      return;
    }
    let cancelled = false;
    setAllowed(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/jobs/requirement-sessions?brand=${encodeURIComponent(brand)}`,
          { credentials: "include" }
        );
        const data = await res.json().catch(() => ({}));
        const list = res.ok && Array.isArray(data.sessions) ? data.sessions : [];
        const ok = list.some((s) => String(s._id) === sessionId);
        if (!cancelled) setAllowed(ok);
      } catch {
        if (!cancelled) setAllowed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, brand, user?.id]);

  if (authLoading) {
    return <Loader loadingMessage="Loading…" />;
  }

  if (!user?.id) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <h1 className="text-xl font-bold text-foreground">Your requirement</h1>
        <p className="mt-2 text-sm text-muted">Sign in to open this chat.</p>
        <button
          type="button"
          onClick={() => void signIn()}
          className="mt-6 rounded-xl bg-highlight px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Sign in
        </button>
      </div>
    );
  }

  if (!sessionId || !brand || allowed === false) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <p className="text-sm text-muted">
          This requirement wasn&apos;t found, or you don&apos;t have access to it.
        </p>
        <button
          type="button"
          onClick={() => router.push(`/jobs/posted${qs}`)}
          className="mt-6 text-sm font-medium text-highlight underline"
        >
          Back to your requirements
        </button>
      </div>
    );
  }

  if (allowed !== true) {
    return <Loader loadingMessage="Loading chat…" />;
  }

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-0 w-full flex-col overflow-hidden">
      <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden px-2 md:px-0">
        <ChatBox currentChatId={sessionId} />
      </div>
    </div>
  );
}
