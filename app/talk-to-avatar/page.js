"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import AvatarCard from "../components/AvatarCard";
import Footer from "../components/Footer";
import Loader from "../components/Loader";

async function fetchTalkToAvatars() {
  const res = await fetch("/api/brands?talkToAvatar=true");
  if (!res.ok) throw new Error("Failed to fetch avatars");
  const data = await res.json();
  return data.brands || [];
}

export default function TalkToAvatarPage() {
  const { user, loading: sessionLoading } = useFirebaseSession();
  const brandContext = useBrandContext();
  const router = useRouter();
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (brandContext && brandContext.subdomain !== "kavisha") {
      router.push("/");
    }
  }, [brandContext, router]);

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push("/");
    }
  }, [sessionLoading, user, router]);

  useEffect(() => {
    if (!sessionLoading && brandContext?.subdomain === "kavisha" && user) {
      let cancelled = false;
      setLoading(true);
      setError(null);
      (async () => {
        try {
          const list = await fetchTalkToAvatars();
          if (!cancelled) setAvatars(list);
        } catch (err) {
          if (!cancelled) setError(err.message || "Failed to load avatars");
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [sessionLoading, brandContext, user]);

  if (sessionLoading || !brandContext) {
    return <Loader loadingMessage="Loading..." />;
  }

  if (brandContext.subdomain !== "kavisha" || !user) {
    return <Loader loadingMessage="Redirecting..." />;
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background font-baloo text-foreground">
      <div className="relative overflow-hidden pb-16 pt-12 sm:pb-20 sm:pt-16">
        <div className="homepage-glow homepage-glow-a opacity-40" aria-hidden />

        <div className="relative mx-auto max-w-7xl px-5 md:px-8">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mb-8 inline-flex items-center gap-2 font-figtree text-sm text-muted transition-colors hover:text-foreground sm:mb-10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <header className="mx-auto max-w-3xl text-center">
            <p className="landing-label">Explore</p>
            <h1 className="mt-4 text-3xl font-normal leading-[0.95] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              Talk to <span className="text-accent">Avataars</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl font-figtree text-sm leading-relaxed text-muted sm:mt-6 sm:text-base md:text-lg">
              Talk to leaders in the world of business, finance, art and academia.
              Interact, learn and grow. Also, connect with other fans while
              you&apos;re at it.
            </p>
          </header>

          <section className="mt-12 sm:mt-16 md:mt-20">
            {loading ? (
              <p className="font-figtree text-center text-sm text-muted">Loading…</p>
            ) : error ? (
              <div className="mx-auto flex max-w-md flex-col items-center text-center">
                <p className="font-figtree text-sm text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-5 rounded-xl bg-accent px-6 py-2.5 font-figtree text-sm font-medium text-white transition-all hover:brightness-95"
                >
                  Retry
                </button>
              </div>
            ) : avatars.length === 0 ? (
              <p className="font-figtree text-center text-sm text-muted">
                No avatars available at the moment.
              </p>
            ) : (
              <>
                <p className="mb-8 text-center font-figtree text-xs font-medium uppercase tracking-[0.2em] text-muted md:mb-10">
                  {avatars.length} {avatars.length === 1 ? "Avataar" : "Avataars"}
                </p>
                <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6">
                  {avatars.map((avatar) => (
                    <div key={avatar.id} className="min-w-0">
                      <AvatarCard
                        image={avatar.image}
                        name={avatar.name}
                        title={avatar.title}
                        subtitle={avatar.subtitle}
                        avatarLink={avatar.link}
                        widgetLink={
                          avatar.clientWidgetUrl
                            ? String(avatar.clientWidgetUrl).trim()
                            : ""
                        }
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}
