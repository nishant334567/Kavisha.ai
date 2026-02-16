"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "../lib/firebase/sign-in";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import {
  detectInAppBrowser,
  isMobileDevice,
  openInChrome,
} from "../lib/in-app-browser";
import InfoCard from "./InfoCard";
import AvatarCard from "./AvatarCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Footer from "./Footer";

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
        // Ensure redirectPath is a string and starts with /
        const path = typeof redirectPath === "string" && redirectPath.startsWith("/")
          ? redirectPath
          : "/";
        localStorage.setItem("redirectAfterLogin", path);
      }
      await signIn();
      await refresh();
      // State will update and root page will show logged-in UI
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

  // Get visible count based on screen size
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
    return () => { cancelled = true; };
  }, []);

  const maxIndex = Math.max(0, avatars.length - visibleCount);

  const slideLeft = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const slideRight = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };
  return (
    <div className="mt-8 sm:mt-16">
      <div className="flex flex-col items-center justify-center pt-2 pb-8">

        <img src="/kavisha-logo.png" width={150} height={150} alt="Kavisha" />
      </div>
      <div className="flex flex-col justify-center items-center font-fredoka max-w-[90%] md:max-w-[60%] mx-auto text-center px-4">
        <p className="text-[#004A4E] text-4xl sm:text-5xl md:text-7xl lg:text-[90px] font-normal leading-tight">
          Human <span className="text-[#00B5BD]">connections</span> in the age
          of AI
        </p>
        <p className="my-6 md:my-8 text-lg text-[#264653] font-extralight">
          With Kavisha, Influencers and Brands create their Digital Avataars to
          engage their fans. Fans talk to them, and also find each other.
        </p>
      </div>
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg max-w-md mx-auto text-sm text-center">
          {error}
        </div>
      )}

      {popupBlocked && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-lg max-w-md mx-auto text-sm text-center">
          Popup was blocked. Try again — it&apos;ll work.
        </div>
      )}

      {isBlocked && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg max-w-md mx-auto">
          <p className="text-sm text-gray-700 mb-4 text-center">
            Please open in Chrome to continue
          </p>
          <button
            onClick={openInChrome}
            className="w-full py-3 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Open in Chrome
          </button>
        </div>
      )}

      <div className="font-akshar gap-2 md:gap-4 flex flex-col md:flex-row flex-wrap justify-center items-center mb-8 px-4">
        <button
          onClick={() => {
            if (user) {
              router.push("/talk-to-avatar");
            } else if (!isBlocked) {
              handleSignIn("/talk-to-avatar");
            }
          }}
          disabled={signingIn || isBlocked}
          className="w-[80%] md:w-auto min-w-0 px-3 md:px-4 py-2 text-sm md:text-base rounded-lg bg-[#F2FFFF] text-[#00585C] shadow-md disabled:opacity-50 hover:bg-[#E0F5F5] transition-colors"
        >
          {signingIn ? "Signing in..." : "Talk to Avataars"}
        </button>
        <button
          onClick={() => router.push("/make-avatar")}
          className="w-[80%] md:w-auto min-w-0 px-3 md:px-4 py-2 text-sm md:text-base rounded-lg bg-[#3D5E6B] text-white shadow-md hover:bg-[#2d4752] transition-colors"
        >
          Make my Avataar
        </button>
        <button
          onClick={() => {
            if (user) {
              router.push("/talk-to-avatar");
            } else if (!isBlocked) {
              handleSignIn("/community");
            }
          }}
          disabled={signingIn || isBlocked}
          className="w-[80%] md:w-auto min-w-0 px-4 py-2 text-sm md:text-base rounded-lg bg-[#F2FFFF] text-[#00585C] shadow-md disabled:opacity-50 hover:bg-[#E0F5F5] transition-colors"
        >
          {signingIn ? "Signing in..." : "Connect with people"}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-[85%] mx-auto my-16">
        {cards.map((card) => (
          <InfoCard key={card.title} {...card} />
        ))}
      </div>
      <div className="relative">
        {/* '=' badge: pinned to boundary between cream and teal so it stays vertically consistent on mobile */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[120px] md:top-[160px] -translate-y-1/2 z-10 bg-[#3D4A52] w-10 h-10 md:w-14 md:h-14 rounded-lg shadow-lg flex flex-col items-center justify-center gap-1">
          <div className="w-4 md:w-6 h-[2px] md:h-[3px] bg-[#E8B84A] rounded-full"></div>
          <div className="w-4 md:w-6 h-[2px] md:h-[3px] bg-[#E8B84A] rounded-full"></div>
        </div>
        {/* Top cream section */}
        <div className="bg-[#F9F1D8] text-[#3D5A5E] h-[120px] md:h-[160px] flex justify-center items-center px-4">
          <p className="font-noto-serif text-xl sm:text-2xl md:text-4xl lg:text-5xl text-center">
            Your Digital Avataar on Kavisha
          </p>
        </div>
        {/* Bottom teal section */}
        <div className="bg-[#4A6670] text-white h-auto min-h-[150px] md:h-[180px] flex flex-col justify-center items-center px-4 py-6 md:py-0">
          <p className="font-noto-serif text-lg sm:text-xl md:text-3xl lg:text-4xl mb-2 md:mb-3 text-center">
            Your (Knowledge <span className="text-[#E8B84A]">+</span> History{" "}
            <span className="text-[#E8B84A]">+</span> Personality{" "}
            <span className="text-[#E8B84A]">+</span> Style)
          </p>
          <p className="text-[#B8C5C9] font-assistant text-sm md:text-lg text-center">
            With Kavisha, you'll be able to give your fans delightful
            interactions 24x7x365
          </p>
        </div>
      </div>
      {/* Avatar cards */}
      <div className="flex items-center gap-4 my-6 px-4 md:px-8">
        <p className="font-fredoka text-lg md:text-2xl text-[#264653] whitespace-nowrap">
          Talk to Avataars
        </p>
        <div className="flex-1 h-[1px] bg-[#6B6B6B]"></div>
      </div>
      <div className="max-w-6xl mx-auto px-4 mt-8 md:mt-12">
        {avatarsLoading ? (
          <p className="text-center text-gray-500">Loading avatars…</p>
        ) : avatarsError ? (
          <p className="text-center text-red-600">{avatarsError}</p>
        ) : avatars.length === 0 ? (
          <p className="text-center text-gray-500">No featured avatars yet.</p>
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

      {/* Connect with people section */}
      <div className="mt-8 md:mt-12">
        {/* Header with line */}
        <div className="flex items-center gap-4 mb-6 px-4 md:px-8">
          <div className="flex-1 h-[1px] bg-[#6B6B6B]"></div>
          <p className="font-fredoka text-lg md:text-2xl text-[#264653] whitespace-nowrap">
            Connect with people
          </p>
        </div>

        {/* Two column layout */}
        <div className="flex flex-col md:flex-row">
          {/* Left - Teal section: on mobile full-width paragraph + centered button */}
          <div className="font-akshar md:flex-[4] bg-[#35515b] text-white px-6 md:px-10 py-8 md:py-12 flex flex-col justify-center text-center md:text-left items-center md:items-start">
            <p className="w-full max-w-full text-3xl md:text-5xl lg:text-6xl font-fredoka leading-snug mb-4 md:mb-6">
              <span className="md:block">Your fans can </span>
              <span className="md:block">
                <span className="text-[#f2d75e]">connect </span> with
              </span>
              <span className="md:block"> each other</span>
            </p>
            <button
              onClick={() => {
                if (user) {
                  router.push("/talk-to-avatar");
                } else if (!isBlocked) {
                  handleSignIn("/talk-to-avatar");
                }
              }}
              disabled={signingIn || isBlocked}
              className="w-fit mx-auto md:mx-0 px-4 md:px-5 py-2 rounded-full border border-white text-white text-lg md:text-2xl font-akshar hover:bg-white hover:text-[#35515b] transition-colors disabled:opacity-50"
            >
              {signingIn ? "Signing in..." : "Connect with people"}
            </button>
          </div>

          {/* Right - Cream section */}
          <div className="font-assistant md:flex-[6] bg-[#f7f0dd] text-[#264653] px-6 md:px-10 py-8 md:py-12 flex items-center">
            <p className="text-lg leading-relaxed font-assistant text-center md:text-left">
              Your Digital Avataar doesn't just enable conversations between you
              and your fans, it also gives your fans a chance to connect with
              each other. This makes <span className="font-semibold">you</span>{" "}
              a platform for lifelong, beautiful relationships, where people
              find new connections, and deeper love for you.
            </p>
          </div>
        </div>
        {/* Logo and tagline section */}
        <div className="bg-[linear-gradient(180deg,#FFFFFF_34%,#EDF4F7_100%)] flex flex-col items-center justify-center py-8 md:py-12 px-4 md:px-8 border-b border-gray-200">
          <div className="flex flex-col items-center justify-center pb-4 pt-2">

            <img src="/kavisha-logo.png" width={150} height={150} alt="Kavisha" />
          </div>
          <p className="font-fredoka text-base md:text-xl font-light text-center text-[#264653] max-w-3xl tracking-wide">
            With Kavisha, influencers and brands can interact with their fans,
            create opportunities for them, and make them happy. Like never
            before.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
