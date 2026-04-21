"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "./lib/firebase/sign-in";
import { useFirebaseSession } from "./lib/firebase/FirebaseSessionProvider";
import {
  detectInAppBrowser,
  isMobileDevice,
  openInChrome,
} from "./lib/in-app-browser";
import InfoCard from "./components/InfoCard";
import AvatarCard from "./components/AvatarCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Footer from "./components/Footer";

const cards = [
  {
    title: "Unresponded DMs are lost goodwill",
    body: "Influencers get so many messages, that it's impossible to address them all. But each unresponded message is some goodwill lost.",
    variant: "teal",
    variantMobile: "beige",
  },
  {
    title: "Every inbound is an opportunity",
    body: "Whether it's a harmless pleasantry, or a curious business enquiry, it's all lost in the sea of DMs. That's wasted opportunity.",
    variant: "beige",
    variantMobile: "teal",
  },
  {
    title: "Your Digital Avataar can unlock value",
    body: "With Kavisha, it's now possible to engage with fans in a much deeper way. Every DM now leads to a force multiplier, a sale, or a happier fan.",
    variant: "beige",
    variantMobile: "beige",
  },
  {
    title: "Give your fans an experience like never before",
    body: "Your fans now get the gift of your conversations, knowing you're behind them. This is something they'd really appreciate, and never forget.",
    variant: "teal",
    variantMobile: "teal",
  },
];

async function fetchFeaturedAvatars() {
  const res = await fetch("/api/brands?featured=true");
  if (!res.ok) throw new Error("Failed to fetch featured avatars");
  const data = await res.json();
  return data.brands || [];
}

export default function Homepage() {
  const router = useRouter();
  const { user, refresh } = useFirebaseSession();

  const [currentIndex, setCurrentIndex] = useState(0);
  const sliderRef = useRef(null);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [avatars, setAvatars] = useState([]);
  const [avatarsLoading, setAvatarsLoading] = useState(true);
  const [avatarsError, setAvatarsError] = useState(null);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loadingPath, setLoadingPath] = useState(null);

  useEffect(() => {
    setIsInAppBrowser(detectInAppBrowser());
    setIsMobile(isMobileDevice());
  }, []);

  const isBlocked = isInAppBrowser && isMobile;

  const handleSignIn = async (redirectPath = null) => {
    setSigningIn(true);
    setError("");
    setPopupBlocked(false);

    try {
      if (redirectPath && typeof window !== "undefined") {
        const path =
          typeof redirectPath === "string" && redirectPath.startsWith("/")
            ? redirectPath
            : "/";
        localStorage.setItem("redirectAfterLogin", path);
      }

      await signIn();
      await refresh();
    } catch (e) {
      if (e?.code === "auth/popup-blocked") {
        setPopupBlocked(true);
      } else {
        setError(e.message || "Sign in failed");
      }
    } finally {
      setSigningIn(false);
    }
  };

  const getVisibleCount = () => {
    if (typeof window === "undefined") return 3;
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  };

  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    const handleResize = () => setVisibleCount(getVisibleCount());
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAvatarsLoading(true);
    setAvatarsError(null);

    (async () => {
      try {
        const list = await fetchFeaturedAvatars();
        if (!cancelled) setAvatars(list);
      } catch (e) {
        if (!cancelled) setAvatarsError(e.message || "Failed to load avatars");
      } finally {
        if (!cancelled) setAvatarsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const maxIndex = Math.max(0, avatars.length - visibleCount);

  const slideLeft = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const slideRight = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  return (
    <div className="mt-8 text-foreground sm:mt-16">

      {/* ── HERO SECTION ── */}
      <div className="flex flex-col justify-center min-h-[80vh] pb-16">
        <div className="flex flex-col items-center justify-center pt-2 pb-8">
          <img src="/kavisha-logo.png" width={150} height={150} alt="Kavisha" />
        </div>

        <div className="flex flex-col justify-center items-center mx-auto text-center px-4 w-full">
          <p className="text-3xl font-normal leading-tight text-[#004A4E] dark:text-[#c7f9fb] sm:text-5xl md:text-7xl lg:text-[90px]">
            Future of <span className="text-[#00B5BD]">Digital</span><br />
            profiles
          </p>
          <p className="max-w-3xl mx-auto my-6 text-xl md:text-2xl leading-relaxed font-extralight text-[#264653] dark:text-muted md:my-8">
            With Kavisha, Influencers and Brands create their Digital Avataars to
            engage their fans. Fans talk to them, and also find each other. These
            Avataars are now also being deployed as AI Agents on websites.
          </p>
        </div>

        {error && (
          <div className="mx-auto mb-6 max-w-md rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {popupBlocked && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-lg max-w-md mx-auto text-sm text-center">
            Tap again to enable pop-up! Cheers! :)
          </div>
        )}

        {isBlocked && (
          <div className="mx-auto mb-6 max-w-md rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="mb-4 text-center text-sm text-muted">
              Please open in Chrome to continue
            </p>
            <button
              onClick={openInChrome}
              className="w-full rounded-lg bg-[#2D545E] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#264850]"
            >
              Open in Chrome
            </button>
          </div>
        )}

        {/* ── BUTTONS SECTION ── */}
        <div className="gap-5 md:gap-8 flex flex-col md:flex-row flex-wrap justify-center items-center px-4 mt-6 mb-4">
          <button
            onClick={() => {
              setLoadingPath("/make-avatar");
              router.push("/make-avatar");
            }}
            disabled={loadingPath !== null}
            className="w-[80%] md:w-auto min-w-0 px-8 md:px-12 py-2 md:py-3 text-xl font-semibold rounded-xl bg-gradient-to-b from-[#4A7282] to-[#365461] text-white shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all duration-300 disabled:opacity-50 tracking-wide"
          >
            {loadingPath === "/make-avatar" ? "Opening..." : "Make my Avataar"}
          </button>

          <button
            onClick={() => {
              // Add your routing logic here
            }}
            className="w-[80%] md:w-auto min-w-0 px-8 md:px-12 py-2 md:py-3 text-xl font-semibold rounded-xl bg-gradient-to-b from-[#E2F7F8] to-[#CEEBEB] text-[#264653] shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all duration-300 tracking-wide"
          >
            Explore AI Widgets
          </button>
        </div>
      </div>

      {/* ── ORIGINAL CARDS SECTION ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-[85%] mx-auto my-16">
        {cards.map((card) => (
          <InfoCard key={card.title} {...card} />
        ))}
      </div>

      {/* ── MATH EQUATION SECTION ── */}
      <div className="relative">
        <div className="absolute left-1/2 -translate-x-1/2 top-[120px] md:top-[160px] -translate-y-1/2 z-10 bg-[#3D4A52] w-10 h-10 md:w-14 md:h-14 rounded-lg shadow-md flex flex-col items-center justify-center gap-1 border border-white/5">
          <div className="w-4 md:w-6 h-[2px] md:h-[3px] bg-[#E8B84A] rounded-full"></div>
          <div className="w-4 md:w-6 h-[2px] md:h-[3px] bg-[#E8B84A] rounded-full"></div>
        </div>

        <div className="flex h-[120px] items-center justify-center bg-gradient-to-b from-[#FCFAEF] to-[#F0E5C9] px-4 text-[#2D4752] md:h-[160px]">
          <p className="font-baloo text-xl sm:text-2xl md:text-4xl lg:text-5xl text-center">
            Your Digital Avataar on Kavisha
          </p>
        </div>

        <div className="bg-gradient-to-b from-[#4A6670] to-[#3B525B] text-white h-auto min-h-[150px] md:h-[180px] flex flex-col justify-center items-center px-4 py-6 md:py-0">
          <p className="font-baloo text-lg sm:text-xl md:text-3xl lg:text-4xl mb-2 md:mb-3 text-center">
            Your (Knowledge <span className="text-[#E8B84A]">+</span> History{" "}
            <span className="text-[#E8B84A]">+</span> Personality{" "}
            <span className="text-[#E8B84A]">+</span> Style)
          </p>
          <p className="text-[#B8C5C9] text-sm md:text-lg text-center font-light tracking-wide">
            With Kavisha, you'll be able to give your fans delightful
            interactions 24x7x365
          </p>
        </div>
      </div>

      {/* ── CUSTOM DOMAIN SECTION ── */}
      <div className="flex flex-col-reverse md:flex-row items-center gap-10 md:gap-16 max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24">
        <div className="flex-1 flex flex-col text-center md:text-left items-center md:items-start">
          <h2 className="text-2xl md:text-4xl font-normal text-foreground leading-snug mb-4">
            Your Digital Avataar on a <br className="hidden md:block" />
            custom domain
          </h2>
          <p className="text-base md:text-lg text-muted leading-relaxed mb-6 max-w-lg">
            You could host your Digital Avataar on yourname.kavisha.ai for free!
            It'll be the place for conversations with your AI, your community,
            your social links, and everything else.
          </p>
          <a
            href="/make-avatar"
            className="text-[#17638C] font-medium text-base md:text-lg hover:underline"
          >
            Read more &gt;&gt;
          </a>
        </div>

        <div className="flex-1 flex justify-center md:justify-end">
          <div className="w-[260px] md:w-[310px] rounded-3xl border border-gray-200 shadow-2xl overflow-hidden bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-500 fill-current">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold tracking-widest text-gray-700 uppercase">
                  Vishal Gupta
                </span>
              </div>
              <div className="flex flex-col gap-[3px] cursor-pointer">
                <div className="w-4 h-[2px] bg-gray-500 rounded" />
                <div className="w-4 h-[2px] bg-gray-500 rounded" />
                <div className="w-4 h-[2px] bg-gray-500 rounded" />
              </div>
            </div>

            <div className="w-full h-32 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-16 h-16 text-gray-400 fill-current">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            </div>

            <div className="px-4 py-3">
              <p className="text-center text-xs font-semibold text-gray-800 mb-2">
                Professor of Organizational Behavior, IIM Ahmedabad
              </p>
              <p className="text-[10px] text-gray-500 text-justify leading-relaxed line-clamp-5">
                An IIM Ahmedabad professor who integrates modern management
                science with ancient Indian wisdom to advance leadership and
                organisational development, happiness and management research. I
                train students, faculty and professionals on happiness skills,
                leadership skills and research skills.
              </p>
            </div>

            <div className="flex justify-around items-center py-2 border-t border-gray-100 px-1">
              {[
                { label: "Services", active: false },
                { label: "Community", active: false },
                { label: "Home", active: true },
                { label: "Chats", active: false },
                { label: "Links", active: false },
              ].map(({ label, active }) => (
                <div key={label} className="flex flex-col items-center gap-0.5">
                  <div
                    className={`w-4 h-4 rounded-sm ${active ? "bg-[#008282]" : "bg-gray-300"}`}
                  />
                  <span
                    className={`text-[8px] ${active ? "text-[#008282] font-medium" : "text-gray-400"}`}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── AI WIDGET SECTION ── */}
      <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16 max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24">
        <div className="flex-1 flex justify-center md:justify-start">
          <div className="w-[260px] md:w-[300px] rounded-2xl border border-gray-200 shadow-2xl overflow-hidden bg-white">
            <div className="flex items-center justify-between bg-[#8B0000] px-4 py-3">
              <span className="text-white font-semibold text-sm tracking-wide">
                EntrackrIQ
              </span>
              <button className="text-white text-xl leading-none opacity-80 hover:opacity-100">
                ×
              </button>
            </div>

            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white">
              <span className="text-gray-600 text-xs">Chat history</span>
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>

            <div className="flex gap-1.5 px-3 py-2 bg-white">
              <button className="flex items-center gap-1 bg-[#8B0000] text-white text-[10px] px-2.5 py-1.5 rounded-full font-medium">
                <span className="text-xs">+</span> New c...
              </button>
              <button className="flex items-center gap-1 border border-gray-300 text-gray-500 text-[10px] px-2.5 py-1.5 rounded-full">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                </svg>
                Comm...
              </button>
              <button className="flex items-center gap-1 border border-gray-300 text-gray-500 text-[10px] px-2.5 py-1.5 rounded-full">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign o...
              </button>
            </div>

            <div className="px-4 py-3 space-y-1.5 bg-white">
              <p className="text-gray-700 text-xs">Hello!</p>
              <p className="text-gray-700 text-xs leading-relaxed">
                I'm Entrackr's Digital Avataar, trained on the company's journey
                and work.
              </p>
              <p className="text-gray-700 text-xs">
                Please tell me how I can help you! :)
              </p>
            </div>

            <div className="mx-4 h-[1px] bg-gray-100" />

            <div className="flex items-center gap-2 px-4 py-2">
              <span className="text-[10px] text-gray-500 border border-gray-200 rounded px-2 py-1 truncate">
                What's the latest startup news?
              </span>
              <span className="text-[10px] text-gray-400 flex-shrink-0">Share</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-3 border-t border-gray-100 bg-white">
              <span className="flex-1 text-[11px] text-gray-400">Message...</span>
              <button className="w-8 h-8 bg-[#E87070] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>

            <div className="text-center py-2 border-t border-gray-100 bg-white">
              <span className="text-[10px] text-gray-400">
                Powered by{" "}
                <span className="text-[#8B0000] font-medium">Kavisha</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col text-center md:text-left items-center md:items-start">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground leading-snug mb-4">
            An AI widget on your website itself, giving it Agentic abilities
          </h2>
          <p className="text-base md:text-lg text-muted leading-relaxed mb-6 max-w-lg">
            If you have an existing website, you could give it a super AI Agent
            in the form of a widget. That Agent will talk to your visitors and
            turn casual observers into customers and fans.
          </p>
          <a
            href="/make-avatar"
            className="text-[#17638C] font-medium text-base md:text-lg hover:underline self-center md:self-end"
          >
            Read more &gt;&gt;
          </a>
        </div>
      </div>

      <div className="flex items-center gap-4 my-6 px-4 md:px-8">
        <p className="whitespace-nowrap text-lg text-[#264653] dark:text-foreground md:text-2xl">
          Existing Avataars
        </p>
        <div className="h-[1px] flex-1 bg-border"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 md:mt-12">
        {avatarsLoading ? (
          <p className="text-center text-muted">Loading avatars…</p>
        ) : avatarsError ? (
          <p className="text-center text-red-600">{avatarsError}</p>
        ) : avatars.length === 0 ? (
          <p className="text-center text-muted">No featured avatars yet.</p>
        ) : (
          <div>
            <div className="overflow-hidden px-2 pb-4" ref={sliderRef}>
              <div
                className="flex transition-transform duration-300 ease-in-out"
                style={{
                  gap: "24px",
                  transform: `translateX(calc(-${currentIndex} * (100% / ${visibleCount} + ${24 / visibleCount}px)))`,
                }}
              >
                {avatars.map((avatar) => (
                  <div
                    key={avatar.id}
                    className="flex-shrink-0 flex justify-center"
                    style={{
                      width: `calc((100% - ${(visibleCount - 1) * 24}px) / ${visibleCount})`,
                    }}
                  >
                    {avatar.link ? (
                      <a
                        href={avatar.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex justify-center w-full cursor-pointer hover:opacity-95 active:opacity-90 transition-opacity rounded-2xl focus:outline-none"
                      >
                        <AvatarCard
                          name={avatar.name}
                          title={avatar.title}
                          subtitle={avatar.subtitle}
                          image={avatar.image}
                        />
                      </a>
                    ) : (
                      <AvatarCard
                        name={avatar.name}
                        title={avatar.title}
                        subtitle={avatar.subtitle}
                        image={avatar.image}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {avatars.length > visibleCount && (
              <div className="flex justify-center gap-4 mt-8">
                <button
                  onClick={slideLeft}
                  disabled={currentIndex === 0}
                  className={`group w-10 h-10 rounded-full border-2 border-[#264653] flex items-center justify-center transition-colors ${currentIndex === 0
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-[#264653]"
                    }`}
                >
                  <ChevronLeft className="w-5 h-5 text-[#264653] group-hover:text-white transition-colors" />
                </button>
                <button
                  onClick={slideRight}
                  disabled={currentIndex >= maxIndex}
                  className={`group w-10 h-10 rounded-full border-2 border-[#264653] flex items-center justify-center transition-colors ${currentIndex >= maxIndex
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-[#264653]"
                    }`}
                >
                  <ChevronRight className="w-5 h-5 text-[#264653] group-hover:text-white transition-colors" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 md:mt-12">
        <div className="flex items-center gap-4 mb-6 px-4 md:px-8">
          <div className="h-[1px] flex-1 bg-border"></div>
          <p className="whitespace-nowrap text-lg text-[#264653] dark:text-foreground md:text-2xl font-semibold">
            Connect with people
          </p>
        </div>

        <div className="flex flex-col md:flex-row">
          <div className="md:flex-[4] bg-gradient-to-br from-[#3D5B66] to-[#2E4650] text-white px-6 md:px-10 py-8 md:py-10 flex flex-col justify-center text-center md:text-left items-center md:items-start">
            <p className="w-full max-w-full text-2xl md:text-3xl lg:text-4xl leading-snug mb-5 md:mb-6 font-medium tracking-wide">
              <span className="md:block">Your fans can <span className="text-[#E8B84A]">connect</span> with</span>
              <span className="md:block">each other (and generate</span>
              <span className="md:block">revenue for you)</span>
            </p>
            <button
              onClick={() => {
                if (user) {
                  router.push("/community");
                } else if (!isBlocked) {
                  handleSignIn("/community");
                }
              }}
              disabled={signingIn || isBlocked}
              className="w-fit mx-auto md:mx-0 px-6 md:px-8 py-2 md:py-2.5 rounded-full border border-white/80 text-white text-base md:text-lg hover:bg-white hover:text-[#3D5B66] transition-colors duration-300 disabled:opacity-50 tracking-wide font-medium"
            >
              {signingIn ? "Signing in..." : "Get started"}
            </button>
          </div>

          <div className="flex items-center bg-[#FDFBF4] px-6 py-8 md:flex-[6] md:px-12 md:py-10">
            <p className="text-xl md:text-2xl leading-relaxed text-center md:text-left text-[#2D4752] tracking-wide font-light">
              Your Digital Avataar doesn't just enable conversations
              between you and your fans, it also gives your fans a chance
              to connect with each other. This makes <span className="font-semibold text-black">you</span> a platform for
              lifelong, beautiful relationships, where people find new
              connections, and deeper love for you. And lastly, all of that
              generates revenue for you.
            </p>
          </div>
        </div>

        {/* ── LOGO/TAGLINE SECTION ── */}
        <div className="flex flex-col items-center justify-center bg-gradient-to-b from-white to-[#E4EEF2] dark:from-transparent dark:to-transparent px-4 py-6 md:px-8 md:py-8 border-t border-border/40">
          <div className="flex flex-col items-center justify-center pb-2 pt-1">
            <img src="/kavisha-logo.png" width={120} height={120} alt="Kavisha" className="w-[120px] md:w-[150px]" />
          </div>
          <p className="max-w-3xl text-center text-sm font-light tracking-wide text-muted md:text-lg">
            With Kavisha, influencers and brands can interact with their fans,
            create opportunities for them, and make them happy. Like never
            before.
          </p>
        </div>
      </div>

      {/* ── FOOTER COMPONENT ── */}
      <Footer />

    </div>
  );
}