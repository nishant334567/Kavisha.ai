"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Settings, User, Camera, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useBrandContext } from "../../context/brand/BrandContextProvider";
import { useFirebaseSession } from "../../lib/firebase/FirebaseSessionProvider";
import Loader from "../../components/Loader";
import { BEHAVIOUR_TEMPLATES } from "./behaviourTemplates";

const UNLIMITED_AVATAR_CREATOR_EMAIL = "hello@kavisha.ai";

const stages = {
  BASIC_INFO: 1,
  CUSTOMIZE: 2,
  REVIEW: 3,
};

export default function MakeAvatar() {
  const router = useRouter();
  const brandContext = useBrandContext();
  const { user } = useFirebaseSession();
  const fileInputRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(stages.BASIC_INFO);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [aboutUser, setAboutUser] = useState({ name: "", bio: "" });
  const [coverImage, setCoverImage] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null); // No default, show placeholder

  const [avatarData, setAvatarData] = useState({
    name: "",
    admin_email: "",
    subdomain: "",
    about: "",
    behaviour: "",
    rules: "",
    bio_title: "",
    bio_subtitle: "",
  });
  const [behaviourTemplate, setBehaviourTemplate] = useState("custom");
  const [infoSection, setInfoSection] = useState(null); // 'about' | 'behaviour' | 'rules' | null

  const PERSONALITY_INFO = {
    about: "This section defines who you are — your background, expertise, interests, and the overall tone you want your avatar to sound like. It helps the AI understand your persona and communicate in your voice.",
    behaviour: "This defines how your avatar should behave in conversations — tone, style, personality traits, and how they respond. Think of it as the 'how' your avatar speaks and interacts with users.",
    rules: "These are constraints and guidelines your avatar must follow — what to avoid, what to stay on topic about, and any boundaries. For example: don't use slang, stay professional, or don't make up facts.",
  };

  const [suggestedTitles, setSuggestedTitles] = useState([]);
  const [suggestedSubtitles, setSuggestedSubtitles] = useState([]);
  const [suggestedSubdomains, setSuggestedSubdomains] = useState([]);
  const [hasCreatedAvatar, setHasCreatedAvatar] = useState(false);
  const [checkingAvatar, setCheckingAvatar] = useState(true);
  const [domainSuffix, setDomainSuffix] = useState(".kavisha.ai");
  const canCreateUnlimitedAvatars =
    String(user?.email || "").trim().toLowerCase() ===
    UNLIMITED_AVATAR_CREATOR_EMAIL;
  useEffect(() => {
    const onStaging = typeof window !== "undefined" && window.location.hostname.includes(".staging.");
    setDomainSuffix(onStaging ? ".staging.kavisha.ai" : ".kavisha.ai");
  }, []);

  const handleAboutUserChange = (field, value) => {
    setAboutUser((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarDataChange = (field, value) => {
    setAvatarData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep2 = () => {
    const raw = avatarData.subdomain?.trim() ?? "";
    const normalized = raw.toLowerCase().replace(/\.kavisha\.ai$/i, "");
    if (!normalized) {
      alert(`Please enter a subdomain (e.g. myname for myname${domainSuffix})`);
      return false;
    }
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(normalized)) {
      alert("Subdomain can only contain letters, numbers and hyphens.");
      return false;
    }
    if (!avatarData.admin_email?.trim()) {
      alert("Please enter an admin email");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(avatarData.admin_email.trim())) {
      alert("Please enter a valid email address");
      return false;
    }
    if (!avatarData.about?.trim()) {
      alert("Please tell us about yourself");
      return false;
    }
    return true;
  };

  const createAvatar = async () => {
    if (!validateStep2() || !avatarData.name?.trim()) {
      if (!avatarData.name?.trim()) {
        alert("Please enter a name for your avatar");
      }
      return;
    }

    setSubmitting(true);
    try {
      const subdomain = (avatarData.subdomain ?? "")
        .trim()
        .toLowerCase()
        .replace(/\.kavisha\.ai$/i, "");

      const formData = new FormData();
      formData.append("subdomain", subdomain);
      formData.append("brandName", avatarData.name.trim());
      formData.append("loginButtonText", "Talk to me now");
      formData.append("title", avatarData.bio_title?.trim() || "");
      formData.append("subtitle", avatarData.bio_subtitle?.trim() || "");
      formData.append("email", avatarData.admin_email?.trim() || "");
      formData.append("about", avatarData.about?.trim() || "");
      formData.append("behaviour", avatarData.behaviour?.trim() || "");
      formData.append("rules", avatarData.rules?.trim() || "");

      if (coverImage) {
        formData.append("image", coverImage);
      }

      const response = await fetch("/api/create-avatar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert(
          `Avatar created successfully! Your domain will be live at: ${data.domainName || "your subdomain"}\n\nIt typically takes around 30 minutes for your avatar to be fully up and running. We'll have everything ready for you soon!`
        );
        router.replace("/");
      } else {
        const message = data.error || data.message || "Failed to create avatar. Please try again.";
        alert(message);
      }
    } catch (err) {
      alert("An error occurred while creating your avatar. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const createPersonality = async () => {
    if (!aboutUser.name.trim() || !aboutUser.bio.trim()) {
      alert("Please fill in both name and bio");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/suggest-personality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: aboutUser.bio,
          name: aboutUser.name,
        }),
      });

      const data = await response.json();

      if (data.success && data?.fetchedpersonality) {
        const titles = data.titles || [];
        const subtitles = data.subtitles || [];
        const subdomains = data.subdomains || [];
        setSuggestedTitles(titles);
        setSuggestedSubtitles(subtitles);
        setSuggestedSubdomains(subdomains);
        setAvatarData((prev) => ({
          ...prev,
          name: aboutUser.name,
          about: data.personality ?? prev.about,
          bio_title: titles[0] ?? prev.bio_title,
          bio_subtitle: subtitles[0] ?? prev.bio_subtitle,
          subdomain: subdomains[0] ?? prev.subdomain ?? "",
        }));
        setCurrentStep(stages.CUSTOMIZE);
      } else {
        setAvatarData((prev) => ({ ...prev, name: aboutUser.name }));
        setCurrentStep(stages.CUSTOMIZE);
      }
    } catch (error) {
      setAvatarData((prev) => ({ ...prev, name: aboutUser.name }));
      setCurrentStep(stages.CUSTOMIZE);
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      <span
        className={`text-sm md:text-base font-medium ${currentStep === stages.BASIC_INFO ? "text-highlight" : "text-muted"
          }`}
      >
        Basic info
      </span>
      <div className="h-[1px] w-16 bg-border md:w-24"></div>
      <span
        className={`text-sm md:text-base font-medium ${currentStep === stages.CUSTOMIZE ? "text-highlight" : "text-muted"
          }`}
      >
        Customize
      </span>
      <div className="h-[1px] w-16 bg-border md:w-24"></div>
      <span
        className={`text-sm md:text-base font-medium ${currentStep === stages.REVIEW ? "text-highlight" : "text-muted"
          }`}
      >
        Review
      </span>
    </div>
  );

  const ProfileHeader = () => (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted-bg">
        {coverImagePreview ? (
          <img
            src={coverImagePreview}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-5 h-5 text-highlight" />
        )}
      </div>
      <span className="font-medium text-foreground">
        {aboutUser.name || avatarData.name || "Your Name"}
      </span>
    </div>
  );

  const CoverPhotoSection = ({ showEditButton = false }) => (
    <div
      className={`relative mb-6 h-48 w-full overflow-hidden rounded-xl bg-muted-bg md:h-56 ${showEditButton ? "group cursor-pointer" : ""}`}
      onClick={() => showEditButton && fileInputRef.current?.click()}
    >
      {coverImagePreview ? (
        <>
          <img
            src={coverImagePreview}
            alt="Cover"
            className="w-full h-full object-cover"
          />
          {showEditButton && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          )}
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-card text-muted">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-border">
            <Camera className="w-8 h-8 text-muted" />
          </div>
          <p className="text-sm text-muted">Click to upload your photo</p>
          <p className="mt-1 text-xs text-muted">Recommended: 800x400px</p>
        </div>
      )}
      {showEditButton && coverImagePreview && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="absolute bottom-3 right-3 rounded-md bg-card/80 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-card"
        >
          Edit cover photo
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );

  // Only allow access for kavisha brand
  useEffect(() => {
    if (brandContext && brandContext.subdomain !== "kavisha") {
      router.push("/");
    }
  }, [brandContext, router]);

  // Check if user has already created an avatar
  useEffect(() => {
    let cancelled = false;
    (async () => {
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
    return () => { cancelled = true; };
  }, [canCreateUnlimitedAvatars]);

  if (!brandContext) {
    return <Loader loadingMessage="Loading..." />;
  }

  if (brandContext.subdomain !== "kavisha") {
    return <Loader loadingMessage="Redirecting..." />;
  }

  if (submitting) {
    return <Loader loadingMessage="Creating..." />;
  }

  if (checkingAvatar) {
    return <Loader loadingMessage="Loading..." />;
  }

  if (hasCreatedAvatar) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted-bg">
            <User className="w-5 h-5 text-highlight" />
          </div>
        </div>
        <div className="flex-1 px-4 py-6 md:py-10 flex flex-col items-center justify-center text-center">
          <button
            type="button"
            onClick={() => router.push("/make-avatar")}
            className="-ml-2 mb-6 self-start rounded-full p-2 transition-colors hover:bg-muted-bg"
          >
            <ArrowLeft className="w-5 h-5 text-muted" />
          </button>
          <p className="max-w-sm text-sm text-amber-700">
            Sorry — one avatar per email. You&apos;ve already created yours with this account.
          </p>
          <button
            type="button"
            onClick={() => router.push("/make-avatar")}
            className="mt-6 rounded-full bg-highlight px-6 py-2.5 font-medium text-white transition-colors hover:opacity-90"
          >
            Back to Make Avataar
          </button>
        </div>
      </div>
    );
  }

  const subdomainNorm = (avatarData.subdomain ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.kavisha\.ai$/i, "");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted-bg">
          <User className="w-5 h-5 text-highlight" />
        </div>
        <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full hover:bg-muted-bg">
          <Settings className="w-5 h-5 text-muted" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-6 md:py-10">
        <div className="max-w-xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => {
              if (currentStep === stages.BASIC_INFO) {
                router.back();
              } else if (currentStep === stages.CUSTOMIZE) {
                setCurrentStep(stages.BASIC_INFO);
              } else {
                setCurrentStep(stages.CUSTOMIZE);
              }
            }}
            className="-ml-2 mb-6 rounded-full p-2 transition-colors hover:bg-muted-bg"
          >
            <ArrowLeft className="w-5 h-5 text-muted" />
          </button>

          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-2xl text-foreground md:text-3xl">
              Create your{" "}
              <span className="text-highlight">Digital Avataar</span>
            </h1>
            <p className="mt-2 text-sm text-muted">
              Kavisha enables you to address fans and customers 24/7, with love
            </p>
          </div>

          {/* Step Indicator */}
          <StepIndicator />

          {/* Step 1: Basic Info */}
          {currentStep === stages.BASIC_INFO && (
            <div>
              <h2 className="mb-6 text-center text-xl text-foreground md:text-2xl">
                Tell us about yourself
              </h2>

              <ProfileHeader />
              <CoverPhotoSection showEditButton={true} />

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-5">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Your name
                  </label>
                  <input
                    type="text"
                    value={aboutUser.name}
                    onChange={(e) =>
                      handleAboutUserChange("name", e.target.value)
                    }
                    placeholder="Enter you full name"
                    className="w-full border-b border-border bg-transparent px-4 py-3 text-foreground placeholder:text-muted outline-none transition-colors focus:border-highlight"
                  />
                </div>

                <div className="mb-5">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Tell us about yourself
                  </label>
                  <textarea
                    value={aboutUser.bio}
                    onChange={(e) =>
                      handleAboutUserChange("bio", e.target.value)
                    }
                    rows={4}
                    placeholder="I am business analyst at JPMC..."
                    className="w-full resize-none border-b border-border bg-transparent px-4 py-3 text-foreground placeholder:text-muted outline-none transition-colors focus:border-highlight"
                  />
                  <p className="mt-2 text-xs text-muted">
                    Share your background, expertise, interests, or anything
                    that defines you
                  </p>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={createPersonality}
                    disabled={
                      loading || !aboutUser.name.trim() || !aboutUser.bio.trim()
                    }
                    className="rounded-full bg-highlight px-8 py-2.5 font-medium text-white transition-all hover:opacity-90 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Processing..." : "Continue"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Customize */}
          {currentStep === stages.CUSTOMIZE && (
            <div>
              <h2 className="mb-6 text-center text-xl text-foreground md:text-2xl">
                Customize your Avataar
              </h2>

              <ProfileHeader />
              <CoverPhotoSection showEditButton={true} />

              <div className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm">
                {/* 1. Name */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Name of Avataar
                  </label>
                  <input
                    type="text"
                    value={avatarData.name}
                    onChange={(e) =>
                      handleAvatarDataChange("name", e.target.value)
                    }
                    className="w-full border-b border-border bg-transparent px-4 py-3 text-foreground outline-none transition-colors focus:border-highlight"
                  />
                </div>

                {/* 2. Title */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Title
                  </label>
                  {suggestedTitles.length > 0 ? (
                    <>
                      <select
                        value={suggestedTitles.includes(avatarData.bio_title) ? avatarData.bio_title : "__other__"}
                        onChange={(e) =>
                          handleAvatarDataChange(
                            "bio_title",
                            e.target.value === "__other__" ? "" : e.target.value
                          )
                        }
                        className="w-full rounded-lg border border-border bg-input px-4 py-3 text-foreground outline-none transition-colors focus:border-highlight"
                      >
                        {suggestedTitles.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                        <option value="__other__">Other (type below)</option>
                      </select>
                      {(!avatarData.bio_title || !suggestedTitles.includes(avatarData.bio_title)) && (
                        <input
                          type="text"
                          value={avatarData.bio_title}
                          onChange={(e) =>
                            handleAvatarDataChange("bio_title", e.target.value)
                          }
                          placeholder="Or enter your own title"
                          className="mt-2 w-full border-b border-border bg-transparent px-4 py-3 text-foreground placeholder:text-muted outline-none transition-colors focus:border-highlight"
                        />
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      value={avatarData.bio_title}
                      onChange={(e) =>
                        handleAvatarDataChange("bio_title", e.target.value)
                      }
                      placeholder="Enter a title for avataar"
                      className="w-full border-b border-border bg-transparent px-4 py-3 text-foreground placeholder:text-muted outline-none transition-colors focus:border-highlight"
                    />
                  )}
                </div>

                {/* 3. Subtitle */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Subtitle
                  </label>
                  {suggestedSubtitles.length > 0 ? (
                    <>
                      <select
                        value={suggestedSubtitles.includes(avatarData.bio_subtitle) ? avatarData.bio_subtitle : "__other__"}
                        onChange={(e) =>
                          handleAvatarDataChange(
                            "bio_subtitle",
                            e.target.value === "__other__" ? "" : e.target.value
                          )
                        }
                        className="w-full rounded-lg border border-border bg-input px-4 py-3 text-foreground outline-none transition-colors focus:border-highlight"
                      >
                        {suggestedSubtitles.map((s, i) => (
                          <option key={`sub-${i}`} value={s}>{s.length > 60 ? s.slice(0, 60) + "…" : s}</option>
                        ))}
                        <option value="__other__">Other (type below)</option>
                      </select>
                      {(!avatarData.bio_subtitle || !suggestedSubtitles.includes(avatarData.bio_subtitle)) && (
                        <textarea
                          rows={2}
                          value={avatarData.bio_subtitle}
                          onChange={(e) =>
                            handleAvatarDataChange("bio_subtitle", e.target.value)
                          }
                          placeholder="Or enter your own subtitle"
                          className="mt-2 w-full resize-none border-b border-border bg-transparent px-4 py-3 text-foreground placeholder:text-muted outline-none transition-colors focus:border-highlight"
                        />
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      value={avatarData.bio_subtitle}
                      onChange={(e) =>
                        handleAvatarDataChange("bio_subtitle", e.target.value)
                      }
                      placeholder="Enter a subtitle for avataar"
                      className="w-full border-b border-border bg-transparent px-4 py-3 text-foreground placeholder:text-muted outline-none transition-colors focus:border-highlight"
                    />
                  )}
                </div>

                {/* 4. Domain (Subdomain) */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Subdomain<span className="text-red-500">*</span>
                  </label>
                  {suggestedSubdomains.length > 0 ? (
                    <>
                      <select
                        value={
                          suggestedSubdomains.includes(subdomainNorm)
                            ? subdomainNorm
                            : "__other__"
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          handleAvatarDataChange(
                            "subdomain",
                            v === "__other__" ? "" : v
                          );
                        }}
                        className="w-full border-b border-border bg-transparent px-4 py-3 text-foreground outline-none transition-colors focus:border-highlight"
                      >
                        {suggestedSubdomains.map((s) => (
                          <option key={s} value={s}>
                            {s}{domainSuffix}
                          </option>
                        ))}
                        <option value="__other__">Other (type below)</option>
                      </select>
                      {!suggestedSubdomains.includes(subdomainNorm) && (
                        <input
                          type="text"
                          value={avatarData.subdomain ?? ""}
                          onChange={(e) =>
                            handleAvatarDataChange("subdomain", e.target.value)
                          }
                          placeholder={`e.g., myname or myname${domainSuffix}`}
                          className="mt-2 w-full border-b border-border bg-transparent px-4 py-3 text-foreground placeholder:text-muted outline-none transition-colors focus:border-highlight"
                        />
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      value={avatarData.subdomain}
                      onChange={(e) =>
                        handleAvatarDataChange("subdomain", e.target.value)
                      }
                      placeholder={`e.g., myname or myname${domainSuffix}`}
                      className="w-full border-b border-border bg-transparent px-4 py-3 text-foreground placeholder:text-muted outline-none transition-colors focus:border-highlight"
                    />
                  )}
                  <p className="mt-2 text-xs text-muted">
                    {avatarData.subdomain?.trim()
                      ? `It will become ${avatarData.subdomain.trim().toLowerCase().replace(/\.kavisha\.ai$/i, "").replace(/\.staging\.kavisha\.ai$/i, "")}${domainSuffix}`
                      : `Enter a name (e.g. "myname") — it will become myname${domainSuffix}`}
                  </p>
                </div>

                {/* 5. About */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-foreground">
                      About you<span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setInfoSection((s) => (s === "about" ? null : "about"))}
                      className="rounded-full p-0.5 text-muted transition-colors hover:bg-muted-bg hover:text-highlight"
                      aria-label="About this section"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                  {infoSection === "about" && (
                    <p className="mb-2 rounded-lg border border-border bg-muted-bg px-3 py-2 text-xs text-muted">
                      {PERSONALITY_INFO.about}
                    </p>
                  )}
                  <textarea
                    rows={4}
                    value={avatarData.about}
                    onChange={(e) =>
                      handleAvatarDataChange("about", e.target.value)
                    }
                    placeholder="E.g. I am a professor at IIM Ahmedabad with 10 years of teaching experience. I like to play football and I am also a singer."
                    className="w-full resize-none border-b border-border bg-transparent px-4 py-3 text-foreground placeholder:text-muted outline-none transition-colors focus:border-highlight"
                  />
                  <p className="mt-2 text-xs text-muted">
                    Your background, expertise, interests and how you’d like your Avataar to sound
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Your Avataar's Behaviour & Rules
                  </label>
                  <select
                    value={behaviourTemplate}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBehaviourTemplate(value);
                      if (value === "custom") {
                        setAvatarData((prev) => ({ ...prev, behaviour: "", rules: "" }));
                      } else {
                        const t = BEHAVIOUR_TEMPLATES.find((x) => x.id === value);
                        if (t) {
                          setAvatarData((prev) => ({
                            ...prev,
                            behaviour: t.behaviour,
                            rules: t.rules,
                          }));
                        }
                      }
                    }}
                    className="mb-3 w-full rounded-lg border border-border bg-input px-4 py-3 text-foreground outline-none transition-colors focus:border-highlight"
                  >
                    {BEHAVIOUR_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                    <option value="custom">Custom</option>
                  </select>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="block text-xs text-muted">Behaviour</span>
                        <button
                          type="button"
                          onClick={() => setInfoSection((s) => (s === "behaviour" ? null : "behaviour"))}
                          className="rounded-full p-0.5 text-muted transition-colors hover:bg-muted-bg hover:text-highlight"
                          aria-label="About behaviour"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                      {infoSection === "behaviour" && (
                        <p className="mb-2 rounded border border-border bg-muted-bg px-2 py-1.5 text-xs text-muted">
                          {PERSONALITY_INFO.behaviour}
                        </p>
                      )}
                      <textarea
                        rows={6}
                        value={avatarData.behaviour}
                        onChange={(e) => handleAvatarDataChange("behaviour", e.target.value)}
                        placeholder="How your avatar should behave (e.g. tone, style)"
                        className="w-full resize-none rounded-lg border border-border bg-input px-4 py-3 text-foreground outline-none transition-colors focus:border-highlight"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="block text-xs text-muted">Rules</span>
                        <button
                          type="button"
                          onClick={() => setInfoSection((s) => (s === "rules" ? null : "rules"))}
                          className="rounded-full p-0.5 text-muted transition-colors hover:bg-muted-bg hover:text-highlight"
                          aria-label="About rules"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                      {infoSection === "rules" && (
                        <p className="mb-2 rounded border border-border bg-muted-bg px-2 py-1.5 text-xs text-muted">
                          {PERSONALITY_INFO.rules}
                        </p>
                      )}
                      <textarea
                        rows={6}
                        value={avatarData.rules}
                        onChange={(e) => handleAvatarDataChange("rules", e.target.value)}
                        placeholder="Rules the bot must follow (e.g. don’t use slang, stay on topic)"
                        className="w-full resize-none rounded-lg border border-border bg-input px-4 py-3 text-foreground outline-none transition-colors focus:border-highlight"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Select a personality type or Custom to write your own. You can edit the text above anytime.
                  </p>
                </div>

                {/* Admin Email */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Admin Email<span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="email"
                      value={avatarData.admin_email}
                      onChange={(e) =>
                        handleAvatarDataChange("admin_email", e.target.value)
                      }
                      placeholder="nishantmittal2410@gmail.com"
                      className="flex-1 border-b border-border bg-transparent px-4 py-3 text-foreground placeholder:text-muted outline-none transition-colors focus:border-highlight"
                    />
                    <button className="whitespace-nowrap text-sm font-medium text-highlight hover:underline">
                      Add Email
                    </button>
                  </div>
                </div>

                <div className="flex justify-center gap-4 pt-4">
                  <button
                    onClick={() => setCurrentStep(stages.BASIC_INFO)}
                    className="rounded-full border-2 border-highlight px-8 py-2.5 font-medium text-highlight transition-all hover:bg-muted-bg"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (validateStep2()) {
                        setCurrentStep(stages.REVIEW);
                      }
                    }}
                    className="rounded-full bg-highlight px-6 py-2.5 font-medium text-white transition-all hover:opacity-90"
                  >
                    Continue and review
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === stages.REVIEW && (
            <div>
              <h2 className="mb-6 text-center text-xl text-foreground md:text-2xl">
                Review your Avataar
              </h2>

              <ProfileHeader />
              <CoverPhotoSection showEditButton={false} />

              <div className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm">
                {/* 1. Name */}
                <div className="border-b border-border pb-4">
                  <label className="mb-1 block text-sm font-medium text-muted">
                    Name of Avataar
                  </label>
                  <p className="text-foreground">{avatarData.name || "-"}</p>
                </div>

                {/* 2. Title */}
                <div className="border-b border-border pb-4">
                  <label className="mb-1 block text-sm font-medium text-muted">
                    Title
                  </label>
                  <p className="text-foreground">{avatarData.bio_title || "-"}</p>
                </div>

                {/* 3. Subtitle */}
                <div className="border-b border-border pb-4">
                  <label className="mb-1 block text-sm font-medium text-muted">
                    Subtitle
                  </label>
                  <p className="text-foreground">
                    {avatarData.bio_subtitle || "-"}
                  </p>
                </div>

                {/* 4. Domain (Subdomain) */}
                <div className="border-b border-border pb-4">
                  <label className="mb-1 block text-sm font-medium text-muted">
                    Subdomain
                  </label>
                  <p className="font-mono text-foreground">
                    {subdomainNorm ? `${subdomainNorm}${domainSuffix}` : "-"}
                  </p>
                </div>

                {/* 5. About */}
                <div className="border-b border-border pb-4">
                  <label className="mb-1 block text-sm font-medium text-muted">
                    About you
                  </label>
                  <p className="whitespace-pre-wrap text-foreground">
                    {avatarData.about || "-"}
                  </p>
                </div>

                {/* 6. Behaviour & Rules */}
                {(avatarData.behaviour || avatarData.rules) ? (
                  <div className="border-b border-border pb-4">
                    <label className="mb-1 block text-sm font-medium text-muted">
                      Your Avataar's Behaviour & Rules
                    </label>
                    {avatarData.behaviour ? (
                      <p className="mb-2 text-sm text-foreground">
                        <span className="text-muted">Behaviour: </span>
                        {avatarData.behaviour}
                      </p>
                    ) : null}
                    {avatarData.rules ? (
                      <p className="text-sm text-foreground">
                        <span className="text-muted">Rules: </span>
                        {avatarData.rules}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {/* 7. Admin Email */}
                <div className="pb-4">
                  <label className="mb-1 block text-sm font-medium text-muted">
                    Admin Email
                  </label>
                  <p className="text-foreground">
                    {avatarData.admin_email || "-"}
                  </p>
                </div>

                <div className="flex justify-center gap-4 pt-4">
                  <button
                    onClick={() => setCurrentStep(stages.CUSTOMIZE)}
                    className="rounded-full border-2 border-highlight px-8 py-2.5 font-medium text-highlight transition-all hover:bg-muted-bg"
                  >
                    Back to edit
                  </button>
                  <button
                    onClick={createAvatar}
                    disabled={submitting}
                    className="rounded-full bg-highlight px-6 py-2.5 font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Creating..." : "Submit and create avataar"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border py-6 text-center">
        <p className="text-sm text-muted">
          Powered by{" "}
          <span className="font-semibold text-foreground">KAVISHA</span>
        </p>
      </div>
    </div>
  );
}
