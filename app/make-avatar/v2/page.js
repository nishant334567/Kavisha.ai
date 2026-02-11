"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Settings, User, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useBrandContext } from "../../context/brand/BrandContextProvider";
import Loader from "../../components/Loader";

const stages = {
  BASIC_INFO: 1,
  CUSTOMIZE: 2,
  REVIEW: 3,
};

export default function MakeAvatar() {
  const router = useRouter();
  const brandContext = useBrandContext();
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
    bio_title: "",
    bio_subtitle: "",
  });

  const [suggestedTitles, setSuggestedTitles] = useState([]);
  const [suggestedSubtitles, setSuggestedSubtitles] = useState([]);
  const [suggestedSubdomains, setSuggestedSubdomains] = useState([]);
  const [hasCreatedAvatar, setHasCreatedAvatar] = useState(false);
  const [checkingAvatar, setCheckingAvatar] = useState(true);
  const [domainSuffix, setDomainSuffix] = useState(".kavisha.ai");
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
          `Avatar created successfully! Your domain will be available at: ${data.domainName || "your subdomain"}`
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
    <div className="flex items-center justify-center gap-2 mb-8 font-akshar">
      <span
        className={`text-sm md:text-base font-medium ${currentStep === stages.BASIC_INFO ? "text-[#00838F]" : "text-gray-500"
          }`}
      >
        Basic info
      </span>
      <div className="w-16 md:w-24 h-[1px] bg-gray-300"></div>
      <span
        className={`text-sm md:text-base font-medium ${currentStep === stages.CUSTOMIZE ? "text-[#00838F]" : "text-gray-500"
          }`}
      >
        Customize
      </span>
      <div className="w-16 md:w-24 h-[1px] bg-gray-300"></div>
      <span
        className={`text-sm md:text-base font-medium ${currentStep === stages.REVIEW ? "text-[#00838F]" : "text-gray-500"
          }`}
      >
        Review
      </span>
    </div>
  );

  const ProfileHeader = () => (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E0F7FA] to-[#B2EBF2] overflow-hidden flex items-center justify-center">
        {coverImagePreview ? (
          <img
            src={coverImagePreview}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-5 h-5 text-[#00838F]" />
        )}
      </div>
      <span className="font-medium text-gray-800">
        {aboutUser.name || avatarData.name || "Your Name"}
      </span>
    </div>
  );

  const CoverPhotoSection = ({ showEditButton = false }) => (
    <div
      className={`relative w-full h-48 md:h-56 rounded-xl overflow-hidden bg-gray-100 mb-6 ${showEditButton ? "cursor-pointer group" : ""}`}
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
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-100 to-gray-200">
          <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center mb-3">
            <Camera className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-sm text-gray-500">Click to upload your photo</p>
          <p className="text-xs text-gray-400 mt-1">Recommended: 800x400px</p>
        </div>
      )}
      {showEditButton && coverImagePreview && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="absolute bottom-3 right-3 px-3 py-1.5 bg-gray-800/70 text-white text-sm rounded-md hover:bg-gray-800/90 transition-colors"
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
        if (!cancelled && data?.user?.hasCreatedAvatar) setHasCreatedAvatar(true);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setCheckingAvatar(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-[#E0F7FA] flex items-center justify-center">
            <User className="w-5 h-5 text-[#00838F]" />
          </div>
        </div>
        <div className="flex-1 px-4 py-6 md:py-10 flex flex-col items-center justify-center text-center">
          <button
            type="button"
            onClick={() => router.push("/make-avatar")}
            className="mb-6 p-2 -ml-2 self-start hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <p className="text-sm text-amber-700 max-w-sm">
            Sorry — one avatar per email. You&apos;ve already created yours with this account.
          </p>
          <button
            type="button"
            onClick={() => router.push("/make-avatar")}
            className="mt-6 px-6 py-2.5 bg-[#3D5A5E] text-white rounded-full font-medium hover:bg-[#2d4448] transition-colors"
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="w-10 h-10 rounded-full bg-[#E0F7FA] flex items-center justify-center">
          <User className="w-5 h-5 text-[#00838F]" />
        </div>
        <div className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 cursor-pointer">
          <Settings className="w-5 h-5 text-gray-600" />
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
            className="mb-6 p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="font-fredoka text-2xl md:text-3xl text-gray-800">
              Create your{" "}
              <span className="text-[#00838F]">Digital Avataar</span>
            </h1>
            <p className="text-gray-500 text-sm mt-2">
              Kavisha enables you to address fans and customers 24/7, with love
            </p>
          </div>

          {/* Step Indicator */}
          <StepIndicator />

          {/* Step 1: Basic Info */}
          {currentStep === stages.BASIC_INFO && (
            <div>
              <h2 className="font-fredoka text-xl md:text-2xl text-center text-gray-800 mb-6">
                Tell us about yourself
              </h2>

              <ProfileHeader />
              <CoverPhotoSection showEditButton={true} />

              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your name
                  </label>
                  <input
                    type="text"
                    value={aboutUser.name}
                    onChange={(e) =>
                      handleAboutUserChange("name", e.target.value)
                    }
                    placeholder="Enter you full name"
                    className="w-full px-4 py-3 border-b border-gray-300 focus:border-[#00838F] outline-none transition-colors bg-transparent"
                  />
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tell us about yourself
                  </label>
                  <textarea
                    value={aboutUser.bio}
                    onChange={(e) =>
                      handleAboutUserChange("bio", e.target.value)
                    }
                    rows={4}
                    placeholder="I am business analyst at JPMC..."
                    className="w-full px-4 py-3 border-b border-gray-300 focus:border-[#00838F] outline-none transition-colors bg-transparent resize-none"
                  />
                  <p className="mt-2 text-xs text-gray-500">
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
                    className="px-8 py-2.5 bg-[#3D5A5E] text-white rounded-full font-medium hover:bg-[#2d4448] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
              <h2 className="font-fredoka text-xl md:text-2xl text-center text-gray-800 mb-6">
                Customize your Avataar
              </h2>

              <ProfileHeader />
              <CoverPhotoSection showEditButton={true} />

              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name of Avataar
                  </label>
                  <input
                    type="text"
                    value={avatarData.name}
                    onChange={(e) =>
                      handleAvatarDataChange("name", e.target.value)
                    }
                    className="w-full px-4 py-3 border-b border-gray-300 focus:border-[#00838F] outline-none transition-colors bg-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        className="w-full px-4 py-3 border-b border-gray-300 focus:border-[#00838F] outline-none transition-colors bg-transparent"
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
                          className="mt-2 w-full px-4 py-3 border-b border-gray-300 focus:border-[#00838F] outline-none transition-colors bg-transparent"
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
                      className="w-full px-4 py-3 border-b border-gray-300 focus:border-[#00838F] outline-none transition-colors bg-transparent"
                    />
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    {avatarData.subdomain?.trim()
                      ? `It will become ${avatarData.subdomain.trim().toLowerCase().replace(/\.kavisha\.ai$/i, "").replace(/\.staging\.kavisha\.ai$/i, "")}${domainSuffix}`
                      : `Enter a name (e.g. "myname") — it will become myname${domainSuffix}`}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    About you<span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={avatarData.about}
                    onChange={(e) =>
                      handleAvatarDataChange("about", e.target.value)
                    }
                    placeholder="E.g. I am a professor at IIM Ahmedabad with 10 years of teaching experience. I like to play football and I am also a singer."
                    className="w-full px-4 py-3 border-b border-gray-300 focus:border-[#00838F] outline-none transition-colors bg-transparent resize-none"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Your background, expertise, interests and how you’d like your Avataar to sound
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="flex-1 px-4 py-3 border-b border-gray-300 focus:border-[#00838F] outline-none transition-colors bg-transparent"
                    />
                    <button className="text-[#00838F] text-sm font-medium hover:underline whitespace-nowrap">
                      Add Email
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-[#00838F] outline-none transition-colors bg-transparent"
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
                          className="w-full mt-2 px-4 py-3 border-b border-gray-300 focus:border-[#00838F] outline-none transition-colors bg-transparent"
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
                      className="w-full px-4 py-3 border-b border-gray-300 focus:border-[#00838F] outline-none transition-colors bg-transparent"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-[#00838F] outline-none transition-colors bg-transparent"
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
                          className="w-full mt-2 px-4 py-3 border-b border-gray-300 focus:border-[#00838F] outline-none transition-colors bg-transparent resize-none"
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
                      className="w-full px-4 py-3 border-b border-gray-300 focus:border-[#00838F] outline-none transition-colors bg-transparent"
                    />
                  )}
                </div>

                <div className="flex justify-center gap-4 pt-4">
                  <button
                    onClick={() => setCurrentStep(stages.BASIC_INFO)}
                    className="px-8 py-2.5 border-2 border-[#3D5A5E] text-[#3D5A5E] rounded-full font-medium hover:bg-gray-50 transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (validateStep2()) {
                        setCurrentStep(stages.REVIEW);
                      }
                    }}
                    className="px-6 py-2.5 bg-[#3D5A5E] text-white rounded-full font-medium hover:bg-[#2d4448] transition-all"
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
              <h2 className="font-fredoka text-xl md:text-2xl text-center text-gray-800 mb-6">
                Review your Avataar
              </h2>

              <ProfileHeader />
              <CoverPhotoSection showEditButton={false} />

              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Name of Avataar
                  </label>
                  <p className="text-gray-900">{avatarData.name || "-"}</p>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Subdomain
                  </label>
                  <p className="text-gray-900 font-mono">
                    {subdomainNorm ? `${subdomainNorm}${domainSuffix}` : "-"}
                  </p>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Admin Email
                  </label>
                  <p className="text-gray-900">
                    {avatarData.admin_email || "-"}
                  </p>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    About you
                  </label>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {avatarData.about || "-"}
                  </p>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Title
                  </label>
                  <p className="text-gray-900">{avatarData.bio_title || "-"}</p>
                </div>

                <div className="pb-4">
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Subtitle
                  </label>
                  <p className="text-gray-900">
                    {avatarData.bio_subtitle || "-"}
                  </p>
                </div>

                <div className="flex justify-center gap-4 pt-4">
                  <button
                    onClick={() => setCurrentStep(stages.CUSTOMIZE)}
                    className="px-8 py-2.5 border-2 border-[#3D5A5E] text-[#3D5A5E] rounded-full font-medium hover:bg-gray-50 transition-all"
                  >
                    Back to edit
                  </button>
                  <button
                    onClick={createAvatar}
                    disabled={submitting}
                    className="px-6 py-2.5 bg-[#3D5A5E] text-white rounded-full font-medium hover:bg-[#2d4448] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
      <div className="py-6 text-center border-t border-gray-100">
        <p className="text-sm text-gray-500">
          Powered by{" "}
          <span className="font-semibold text-gray-700">KAVISHA</span>
        </p>
      </div>
    </div>
  );
}
