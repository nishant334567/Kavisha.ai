"use client";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

const LoadingDots = () => (
  <span className="inline-flex gap-0.5 items-center">
    <span className="w-1.5 h-1.5 rounded-full bg-current animate-loading-dots" />
    <span className="w-1.5 h-1.5 rounded-full bg-current animate-loading-dots [animation-delay:0.2s]" />
    <span className="w-1.5 h-1.5 rounded-full bg-current animate-loading-dots [animation-delay:0.4s]" />
  </span>
);

export default function AdminHome() {
  const router = useRouter();
  const brand = useBrandContext();
  const [chatRequestCount, setChatRequestCount] = useState(0);
  const [communityCount, setCommunityCount] = useState(0);
  const [quizSurveyAttemptCount, setQuizSurveyAttemptCount] = useState(0);
  const [countsLoading, setCountsLoading] = useState(true);
  const go = (path) => router.push(path);

  const goWhatsAppConnect = useCallback(() => {
    const onStaging =
      (typeof window !== "undefined" && window.location.hostname.includes(".staging.")) ||
      process.env.NEXT_PUBLIC_KAVISHA_SITE_ENV === "staging";
    const origin = onStaging
      ? "https://kavisha.staging.kavisha.ai"
      : process.env.NEXT_PUBLIC_APP_URL || "https://kavisha.ai";
    window.location.assign(
      `${origin}/connect/whatsapp?brand=${encodeURIComponent(brand?.subdomain || "")}`
    );
  }, [brand?.subdomain]);

  useEffect(() => {
    const fetchCounts = async () => {
      if (brand?.subdomain) {
        setCountsLoading(true);
        try {
          const response = await fetch(
            `/api/admin/fetch-sessions?brand=${brand.subdomain}&count=true`
          );
          const data = await response.json();
          if (data.success) {
            setChatRequestCount(data.chatRequestCount || 0);
            setCommunityCount(data.communityCount || 0);
            setQuizSurveyAttemptCount(data.quizSurveyAttemptCount || 0);
          }
        } catch (error) {
          console.error("Failed to fetch counts:", error);
        } finally {
          setCountsLoading(false);
        }
      } else {
        setCountsLoading(false);
      }
    };
    fetchCounts();
  }, [brand?.subdomain]);
  const primaryButtons = [
    {
      label: "Chat Requests",
      path: `/admin/${brand?.subdomain}/chat-requests`,
      count: countsLoading ? <LoadingDots /> : chatRequestCount,
    },
    {
      label: "Community",
      path: `/admin/${brand?.subdomain}/my-community`,
      count: countsLoading ? <LoadingDots /> : communityCount,
    },
    {
      label: "Revenue",
      path: `/admin/${brand?.subdomain}/revenue`,
    },
  ];
  const featureButtons = [
    ...(brand?.enableBooking
      ? [
        {
          label: "Bookings",
          path: `/admin/services?subdomain=${encodeURIComponent(brand?.subdomain || "")}`,
        },
      ]
      : []),
    ...(brand?.enableQuiz
      ? [
        {
          label: "Quizzes/Survey",
          path: `/admin/quiz`,
          count: countsLoading ? <LoadingDots /> : quizSurveyAttemptCount,
        },
      ]
      : []),
    ...(brand?.enableProducts
      ? [
        {
          label: "Store",
          path: `/admin/products?subdomain=${encodeURIComponent(brand?.subdomain || "")}`,
        },
      ]
      : []),
    ...(brand?.enableJobs
      ? [
        {
          label: "My Jobs",
          path: `/admin/jobs?subdomain=${encodeURIComponent(brand?.subdomain || "")}`,
        },
      ]
      : []),
    ...(brand?.enableBlogs
      ? [
        {
          label: "Blog",
          path: `/admin/blogs?subdomain=${encodeURIComponent(brand?.subdomain || "")}`,
        },
      ]
      : []),
    ...(brand?.enableLinks !== false
      ? [
        {
          label: "Links",
          path: `/admin/links?subdomain=${encodeURIComponent(brand?.subdomain || "")}`,
        },
      ]
      : []),
    { label: "Connect WhatsApp", action: goWhatsAppConnect },
  ];
  return (
    <div className="relative flex h-[calc(100vh-56px)] flex-col bg-background text-foreground">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex items-center justify-center text-center">
          <p className="px-4 font-baloo text-5xl text-highlight md:text-6xl">
            Welcome, {brand?.brandName?.split(" ")?.[0]} !
          </p>
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 font-baloo">
          <div className="flex flex-wrap items-center justify-center gap-y-3">
            {primaryButtons.map((button, index) => (
              <div key={button.label} className="flex items-center">
                {index > 0 && <div className="mx-1 h-6 w-px self-center bg-border" />}
                <button
                  onClick={() => go(button.path)}
                  className="text-md flex items-center gap-2 bg-transparent px-4 py-2 uppercase text-foreground md:text-2xl"
                >
                  {button.label}
                  <span className="min-w-[2ch] rounded bg-muted-bg px-2 py-0.5 text-sm font-normal text-muted md:text-base">
                    {button.count}
                  </span>
                </button>
              </div>
            ))}
          </div>
          {featureButtons.length > 0 && (
            <>

              <div className="flex flex-wrap items-center justify-center gap-y-3">
                {featureButtons.map((button, index) => (
                  <div key={button.label} className="flex items-center">
                    {index > 0 && <div className="mx-1 h-6 w-px self-center bg-border" />}
                    <button
                      onClick={() => (button.action ? button.action() : go(button.path))}
                      className="text-md flex items-center gap-2 bg-transparent px-4 py-2 uppercase text-foreground md:text-2xl"
                    >
                      {button.label}
                      {button.count ? (
                        <span className="min-w-[2ch] rounded bg-muted-bg px-2 py-0.5 text-sm font-normal text-muted md:text-base">
                          {button.count}
                        </span>
                      ) : null}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className=" h-12 flex items-center justify-center px-6">
        <div className="text-sm font-baloo text-muted">
          Powered by KAVISHA
        </div>
      </div>
    </div>
  );
}
