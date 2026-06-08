"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Layers,
  Zap,
} from "lucide-react";
import AvatarCard from "./AvatarCard";
import Footer from "./Footer";

const LAUNCH_CARDS = [
  {
    id: "avatar",
    num: "01",
    tag: "Avataar",
    title: "A living profile at yourname.kavisha.ai",
    highlight: "yourname.kavisha.ai",
    description:
      "Chat, community, links, and personality — hosted for free on your own subdomain.",
    cta: "Start building",
    href: "/make-avatar",
    image: "/kavisha-avataar.png",
    imageAlt: "Digital Avataar on a custom Kavisha domain",
    dark: false,
  },
  {
    id: "widget",
    num: "02",
    tag: "Widget",
    title: "Agentic AI, one line of code",
    description:
      "Embed on any site. Talk to visitors. Convert attention into action.",
    cta: "See how it works",
    href: "/widget-intro",
    image: "/entrackr-widget.png",
    imageAlt: "Kavisha AI widget on a website",
    dark: true,
  },
];

const PILLARS = [
  {
    icon: MessageCircle,
    title: "Always on",
    body: "Reply to every fan, visitor, and DM — without burning out.",
  },
  {
    icon: Layers,
    title: "Truly you",
    body: "Trained on your voice, knowledge, and style — not generic chatbot fluff.",
  },
  {
    icon: Zap,
    title: "Built to convert",
    body: "Turn casual interest into community, customers, and lasting goodwill.",
  },
];

async function fetchFeaturedAvatars() {
  const res = await fetch("/api/brands?featured=true");
  if (!res.ok) throw new Error("Failed to fetch featured avatars");
  const data = await res.json();
  return data.brands || [];
}

function Hero({ onNavigate }) {
  return (
    <section className="homepage-hero relative overflow-hidden">
      <div className="homepage-glow homepage-glow-a" aria-hidden />
      <div className="homepage-glow homepage-glow-b" aria-hidden />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-12 sm:gap-12 sm:pb-24 sm:pt-16 md:px-8 md:pb-32 md:pt-20 lg:min-h-[calc(100dvh-3.5rem)] lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-20">
        <div className="homepage-fade-up mx-auto max-w-xl text-center sm:mx-0 sm:text-left lg:max-w-none" style={{ animationDelay: "0ms" }}>
          <p className="mb-5 landing-label">
            AI presence platform
          </p>

          <h1
            className="homepage-fade-up text-[2.25rem] font-normal leading-[0.95] tracking-[-0.02em] text-foreground sm:text-5xl md:text-6xl lg:text-[4.25rem] xl:text-[4.75rem]"
            style={{ animationDelay: "60ms" }}
          >
            Be everywhere
            <br />
            your audience
            <br />
            <span className="text-accent">already is.</span>
          </h1>

          <p
            className="homepage-fade-up mx-auto mt-6 max-w-md font-figtree text-sm leading-relaxed text-muted sm:mx-0 sm:mt-7 sm:text-base md:text-lg"
            style={{ animationDelay: "120ms" }}
          >
            Create a Digital Avataar on your own domain, or embed an AI agent on
            your website. Kavisha makes you reachable at scale — without losing
            what makes you, you.
          </p>

          <div
            className="homepage-fade-up mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap"
            style={{ animationDelay: "180ms" }}
          >
            <button
              type="button"
              onClick={() => onNavigate("/make-avatar")}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-6 py-3 font-figtree text-sm font-medium text-background transition-transform hover:scale-[1.02] active:scale-[0.98] sm:w-auto md:text-base"
            >
              Create Avataar
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate("/widget-intro")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card/80 px-6 py-3 font-figtree text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:border-accent/40 hover:bg-card sm:w-auto md:text-base"
            >
              Website widget
            </button>
          </div>
        </div>

        <div
          className="homepage-fade-up relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none"
          style={{ animationDelay: "220ms" }}
        >
          <div className="homepage-float relative mx-auto aspect-[4/5] w-full max-w-[260px] sm:max-w-[320px] md:max-w-[380px] lg:ml-auto lg:max-w-[420px]">
            <div className="absolute inset-[8%] rounded-[2rem] border border-border/50 bg-card/60 shadow-2xl shadow-black/[0.06] backdrop-blur-md dark:shadow-black/30" />
            <Link
              href="/make-avatar"
              className="absolute left-0 top-[6%] z-20 w-[72%] overflow-hidden rounded-2xl border border-white/20 shadow-xl transition-transform duration-500 hover:-translate-y-1"
            >
              <img
                src="/kavisha-avataar.png"
                alt="Digital Avataar on a custom Kavisha domain"
                className="block w-full object-cover"
              />
            </Link>
            <Link
              href="/widget-intro"
              className="absolute bottom-[4%] right-0 z-30 w-[68%] overflow-hidden rounded-2xl border border-white/20 shadow-2xl transition-transform duration-500 hover:-translate-y-1"
            >
              <img
                src="/entrackr-widget.png"
                alt="Kavisha AI widget embedded on a website"
                className="block w-full object-cover"
              />
            </Link>
            <div className="absolute left-[18%] top-[42%] z-10 h-24 w-24 rounded-full bg-accent/20 blur-2xl" aria-hidden />
          </div>
        </div>
      </div>
    </section>
  );
}

function LaunchCarousel() {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);

  const syncActive = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.offsetWidth === 0) return;
    const index = Math.round(track.scrollLeft / track.offsetWidth);
    setActive(Math.min(Math.max(index, 0), LAUNCH_CARDS.length - 1));
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener("scroll", syncActive, { passive: true });
    return () => track.removeEventListener("scroll", syncActive);
  }, [syncActive]);

  const goTo = (index) => {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.min(Math.max(index, 0), LAUNCH_CARDS.length - 1);
    track.scrollTo({ left: next * track.offsetWidth, behavior: "smooth" });
    setActive(next);
  };

  return (
    <section className="w-full py-14 sm:py-20 md:py-28">
      <div className="mb-8 px-5 text-center sm:mb-12 md:mb-16 md:px-8">
        <p className="landing-label">
          Two ways to launch
        </p>
        <h2 className="mt-3 text-2xl font-normal tracking-tight text-foreground sm:text-3xl md:text-5xl">
          One platform. Your choice of surface.
        </h2>
      </div>

      <div className="relative w-full">
        <div
          ref={trackRef}
          className="flex w-full overflow-x-auto scroll-smooth scrollbar-none snap-x snap-mandatory [-webkit-overflow-scrolling:touch]"
          role="region"
          aria-label="Launch options carousel"
        >
          {LAUNCH_CARDS.map((card) => (
            <article key={card.id} className="w-full min-w-full shrink-0 snap-start">
              <Link
                href={card.href}
                className={`group mx-5 flex w-[calc(100%-2.5rem)] flex-col overflow-hidden rounded-2xl border transition-shadow hover:shadow-xl sm:mx-8 sm:rounded-[1.75rem] md:mx-8 md:w-[calc(100%-4rem)] md:min-h-[420px] md:flex-row lg:mx-12 lg:w-[calc(100%-6rem)] lg:min-h-[480px] ${
                  card.dark
                    ? "border-white/10 bg-[#0f1f1f] text-white dark:bg-[#0a1414]"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex flex-1 flex-col justify-center p-6 sm:p-8 md:p-12 lg:p-16">
                  <span
                    className={`font-figtree text-xs font-medium uppercase tracking-widest ${
                      card.dark ? "text-white/50" : "text-muted"
                    }`}
                  >
                    {card.num} — {card.tag}
                  </span>
                  <h3
                    className={`mt-3 max-w-lg text-xl leading-snug break-words sm:mt-4 sm:text-2xl md:text-4xl lg:text-[2.75rem] ${
                      card.dark ? "text-white" : "text-foreground"
                    }`}
                  >
                    {card.highlight ? (
                      <>
                        {card.title.split(card.highlight)[0]}
                        <span className="text-accent">{card.highlight}</span>
                      </>
                    ) : (
                      card.title
                    )}
                  </h3>
                  <p
                    className={`mt-4 max-w-md font-figtree text-sm leading-relaxed md:text-base ${
                      card.dark ? "text-white/65" : "text-muted"
                    }`}
                  >
                    {card.description}
                  </p>
                  <span
                    className={`mt-8 inline-flex items-center gap-2 font-figtree text-sm font-medium transition-colors ${
                      card.dark
                        ? "text-accent"
                        : "text-foreground group-hover:text-accent"
                    }`}
                  >
                    {card.cta}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>

                <div
                  className={`flex flex-1 items-center justify-center p-5 sm:p-8 md:p-10 lg:p-14 ${
                    card.dark ? "bg-[#0a1414]/60" : "bg-muted-bg/40"
                  }`}
                >
                  <img
                    src={card.image}
                    alt={card.imageAlt}
                    className="max-h-[160px] w-full max-w-[220px] object-contain transition-transform duration-500 group-hover:scale-[1.03] sm:max-h-[220px] sm:max-w-sm md:max-h-[360px] md:max-w-md lg:max-w-lg"
                    loading="lazy"
                  />
                </div>
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-5 px-5">
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            disabled={active === 0}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2" role="tablist" aria-label="Carousel slides">
            {LAUNCH_CARDS.map((card, i) => (
              <button
                key={card.id}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`Go to ${card.tag}`}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all ${
                  i === active ? "w-8 bg-accent" : "w-2 bg-border hover:bg-muted"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => goTo(active + 1)}
            disabled={active === LAUNCH_CARDS.length - 1}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}

function Pillars() {
  return (
    <section className="border-y border-border/60 bg-muted-bg/50 px-5 py-14 sm:py-20 md:px-8 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 sm:gap-10 md:grid-cols-3 md:gap-8">
        {PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <div key={pillar.title} className="group">
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-accent transition-colors group-hover:border-accent/30">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h3 className="text-xl text-foreground md:text-2xl">{pillar.title}</h3>
              <p className="mt-2 font-figtree text-sm leading-relaxed text-muted md:text-base">
                {pillar.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Manifesto() {
  return (
    <section className="px-5 py-16 sm:py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-4xl text-center">
        <p className="landing-label">
          The idea
        </p>
        <blockquote className="mt-6 text-xl font-normal leading-[1.35] tracking-tight text-foreground sm:text-2xl md:text-4xl lg:text-[2.75rem]">
          Unresponded messages are lost goodwill.
          <span className="block mt-3 text-muted">
            Kavisha turns every inbound into a conversation worth having.
          </span>
        </blockquote>
        <div className="mx-auto mt-12 h-px w-16 bg-border" aria-hidden />
        <p className="mx-auto mt-10 max-w-2xl font-figtree text-base leading-relaxed text-muted md:text-lg">
          Your Avataar carries your knowledge, history, personality, and style —
          so fans get the real you, around the clock.
        </p>
      </div>
    </section>
  );
}

function FeaturedAvatars({ avatars, loading, error }) {
  if (loading) {
    return <p className="font-figtree text-center text-sm text-muted">Loading…</p>;
  }
  if (error) {
    return <p className="text-center text-sm text-red-600">{error}</p>;
  }
  if (avatars.length === 0) {
    return <p className="font-figtree text-center text-sm text-muted">Coming soon.</p>;
  }

  return (
    <div
      className="overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory scroll-smooth [-webkit-overflow-scrolling:touch]"
      role="region"
      aria-label="Featured avatars"
    >
      <div className="flex w-max gap-5 px-5 sm:px-8 md:mx-auto md:min-w-full md:justify-center md:gap-6">
        {avatars.map((avatar) => (
          <div
            key={avatar.id}
            className="snap-start shrink-0"
            style={{ width: "min(16rem, max(14rem, calc(100vw - 4.5rem)))" }}
          >
            <AvatarCard
              name={avatar.name}
              title={avatar.title}
              subtitle={avatar.subtitle}
              image={avatar.image}
              avatarLink={avatar.link}
              widgetLink={
                avatar.clientWidgetUrl ? String(avatar.clientWidgetUrl).trim() : ""
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Homepage() {
  const router = useRouter();
  const [avatars, setAvatars] = useState([]);
  const [avatarsLoading, setAvatarsLoading] = useState(true);
  const [avatarsError, setAvatarsError] = useState(null);

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

  const navigate = (path) => router.push(path);

  return (
    <main className="overflow-x-hidden font-baloo">
      <Hero onNavigate={navigate} />
      <LaunchCarousel />
      <Pillars />

      {/* Featured */}
      <section className="px-5 py-14 sm:py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center md:mb-14">
            <p className="landing-label">
              Live now
            </p>
            <h2 className="mt-2 text-2xl text-foreground md:text-4xl">
              Avataars built on Kavisha
            </h2>
            <Link
              href="/talk-to-avatar"
              className="mt-5 inline-flex items-center gap-1.5 font-figtree text-sm font-medium text-muted transition-colors hover:text-accent"
            >
              View all Avataars
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <FeaturedAvatars
            avatars={avatars}
            loading={avatarsLoading}
            error={avatarsError}
          />
        </div>
      </section>

      <Manifesto />

      {/* Closing */}
      <section className="border-t border-border px-5 py-16 sm:py-24 md:px-8 md:py-32">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h2 className="text-2xl font-normal tracking-tight text-foreground sm:text-3xl md:text-5xl lg:text-6xl">
            Start for free.
            <br />
            <span className="text-accent">Go live today.</span>
          </h2>
          <p className="mt-5 max-w-lg font-figtree text-base text-muted md:text-lg">
            Whether you need a Digital Avataar or a website widget — Kavisha gets
            you there in minutes, not months.
          </p>
          <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center">
            <button
              type="button"
              onClick={() => navigate("/make-avatar")}
              className="w-full rounded-xl bg-accent px-8 py-3.5 font-figtree text-sm font-medium text-white transition-all hover:brightness-95 sm:w-auto md:text-base"
            >
              Make my Avataar
            </button>
            <button
              type="button"
              onClick={() => navigate("/widget-intro")}
              className="w-full rounded-xl border border-border px-8 py-3.5 font-figtree text-sm font-medium text-foreground transition-colors hover:border-accent/40 sm:w-auto md:text-base"
            >
              Explore widgets
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
