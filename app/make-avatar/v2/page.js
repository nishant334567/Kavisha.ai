"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useBrandContext } from "../../context/brand/BrandContextProvider";
import { useFirebaseSession } from "../../lib/firebase/FirebaseSessionProvider";
import Loader from "../../components/Loader";
import MakeAvatarPreview from "./components/MakeAvatarPreview";
import { COLOR_PRESETS, DEFAULT_COLOR_PRESET } from "./colorPresets";

const UNLIMITED_AVATAR_CREATOR_EMAIL = "hello@kavisha.ai";

export default function MakeAvatar() {
  const router = useRouter();
  const brandContext = useBrandContext();
  const { user } = useFirebaseSession();
  const fileInputRef = useRef(null);

  const [brandName, setBrandName] = useState("");
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_COLOR_PRESET.primary);
  const [coverImage, setCoverImage] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasCreatedAvatar, setHasCreatedAvatar] = useState(false);
  const [checkingAvatar, setCheckingAvatar] = useState(true);

  const canCreateUnlimitedAvatars =
    String(user?.email || "").trim().toLowerCase() ===
    UNLIMITED_AVATAR_CREATOR_EMAIL;

  useEffect(() => {
    if (brandContext && brandContext.subdomain !== "kavisha") {
      router.push("/");
    }
  }, [brandContext, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.email) {
        if (!cancelled) setCheckingAvatar(false);
        return;
      }
      try {
        const res = await fetch("/api/user");
        const data = res.ok ? await res.json() : null;
        if (
          !cancelled &&
          data?.user?.hasCreatedAvatar &&
          !canCreateUnlimitedAvatars
        ) {
          setHasCreatedAvatar(true);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setCheckingAvatar(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.email, canCreateUnlimitedAvatars]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setIconPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const deploy = async () => {
    const trimmedName = brandName.trim();
    if (!trimmedName) {
      alert("Please enter a brand name");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("brandName", trimmedName);
      formData.append("loginButtonText", "Talk to me");
      formData.append("primaryBrandColor", primaryColor);
      if (coverImage) formData.append("image", coverImage);

      const response = await fetch("/api/create-avatar", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (response.ok && data.success) {
        const brand = data.subdomain;
        if (!brand) {
          alert("Avatar created but subdomain was missing. Please contact support.");
          return;
        }
        router.replace(
          `/admin/${encodeURIComponent(brand)}/welcome?subdomain=${encodeURIComponent(brand)}${data.domainName
            ? `&domain=${encodeURIComponent(data.domainName)}`
            : ""
          }`
        );
        return;
      }

      alert(data.error || "Failed to create avatar. Please try again.");
    } catch {
      alert("An error occurred while creating your avatar. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!brandContext || brandContext.subdomain !== "kavisha") {
    return <Loader loadingMessage="Loading..." />;
  }

  if (checkingAvatar) {
    return <Loader loadingMessage="Loading..." />;
  }

  if (submitting) {
    return <Loader loadingMessage="Deploying your avatar..." />;
  }

  if (hasCreatedAvatar) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
        <p className="max-w-sm text-sm text-amber-700">
          Sorry — one avatar per email. You&apos;ve already created yours with this
          account.
        </p>
        <button
          type="button"
          onClick={() => router.push("/make-avatar")}
          className="mt-6 rounded-full bg-highlight px-6 py-2.5 font-medium text-white hover:opacity-90"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16 text-foreground">
      <main className="mx-auto max-w-5xl px-4 pb-16">
        <button
          type="button"
          onClick={() => router.push("/make-avatar")}
          className="mb-8 flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="mb-8 text-center lg:mb-10">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Let&apos;s finalize your Avataar
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted md:text-base">
            Set the basics now — customize personality, training, and more after
            deploy.
          </p>
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-6">
          <section className="flex min-h-[480px] flex-1 flex-col rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Brand name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Nishant"
                  className="w-full rounded-xl border border-border bg-input px-4 py-3 text-foreground outline-none transition-colors placeholder:text-muted focus:border-highlight focus:ring-2 focus:ring-highlight/15"
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-foreground">
                  Color scheme
                </label>
                <div className="flex flex-wrap gap-3 rounded-xl border border-border/60 bg-muted-bg/40 p-3">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setPrimaryColor(preset.primary)}
                      className={`h-9 w-9 rounded-full transition-all hover:scale-105 ${primaryColor === preset.primary
                          ? "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                          : "ring-1 ring-black/10"
                        }`}
                      style={{ backgroundColor: preset.primary }}
                      aria-label={`Color ${preset.id}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-foreground">
                  Widget icon
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted-bg/60 transition-colors hover:border-highlight hover:bg-muted-bg"
                >
                  {iconPreview ? (
                    <img
                      src={iconPreview}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Plus className="h-5 w-5 text-muted" />
                  )}
                </button>
                <p className="mt-2 text-xs text-muted">
                  Optional photo for the chat widget.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div className="mt-auto space-y-4 pt-8">
              {user?.email && (
                <p className="rounded-xl border border-border/70 bg-muted-bg/50 px-4 py-3 text-xs leading-relaxed text-muted">
                  <span className="font-medium text-foreground">{user.email}</span>{" "}
                  will be the admin account for this avatar.
                </p>
              )}
              <button
                type="button"
                onClick={deploy}
                disabled={!brandName.trim()}
                className="w-full rounded-xl bg-highlight py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Deploy
              </button>
            </div>
          </section>

          <section className="flex min-h-[480px] flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <MakeAvatarPreview
              brandName={brandName}
              primaryColor={primaryColor}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
