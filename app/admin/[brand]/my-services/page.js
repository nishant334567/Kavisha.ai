"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Edit2,
  Check,
  X,
  ArrowUpRight,
  Trash2,
  ImageUp,
} from "lucide-react";
import ServiceModal from "@/app/admin/components/ServiceModal";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { normalizeBrandHex } from "@/app/lib/brandTheme";

export default function MyServices() {
  const router = useRouter();
  const brandContext = useBrandContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [addNewservice, setAddnewservice] = useState(false);
  const [showAddserviceoptions, setshowAddserviceoptions] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [featureData, setFeatureData] = useState({
    enableQuiz: brandContext?.enableQuiz || false,
    quizName: brandContext?.quizName || "",
    enableJobs: brandContext?.enableJobs || false,
    enableProducts: brandContext?.enableProducts || false,
    enableBooking: brandContext?.enableBooking || false,
    enableBlogs: brandContext?.enableBlogs || false,
    enableLinks: brandContext?.enableLinks !== false,
    enableCommunityOnboarding: true,
    communityName: brandContext?.communityName || "",
    enableProfessionalConnect: brandContext?.enableProfessionalConnect || false,
    enableFriendConnect: brandContext?.enableFriendConnect || false,
  });
  const [updating, setUpdating] = useState(false);
  const [communityBrandColors, setCommunityBrandColors] = useState({
    communityPrimaryBrandColor: "",
    communitySecondaryBrandColor: "",
  });
  const [widgetLauncherAttention, setWidgetLauncherAttention] =
    useState(false);
  const [widgetLauncherTexts, setWidgetLauncherTexts] = useState({
    chatbotWidgetHeader: "",
    copyReadMoreUrl: "",
  });
  const [supportChannel, setSupportChannel] = useState({
    email: "",
    slackUrl: "",
  });
  const widgetButtonFileInputRef = useRef(null);
  const brandSubdomain = brandContext?.subdomain || "";

  const services = brandContext?.services || [];
  const availedServices = services.map((item) => item.name) || [];

  const availableServices = [
    {
      serviceName: "lead_journey",
      serviceTitle: "Talk to me",
      allowMultiple: true,
    },
    { serviceName: "pitch_to_investor", serviceTitle: "Pitch to me" },
    { serviceName: "job_seeker", serviceTitle: "Work with me" },
  ];
  const hasServicesToAdd = availableServices.some(
    (item) => item.allowMultiple || !availedServices.includes(item.serviceName),
  );
  const handleEdit = (service) => {
    setSelectedService(service);
    setAddnewservice(false);
    setIsModalOpen(true);
  };

  const addService = (service) => {
    setSelectedService({
      name: service.serviceName,
      title: service.serviceTitle,
    });
    setAddnewservice(true);
    setshowAddserviceoptions(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedService(null);
    setAddnewservice(false);
  };

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setshowAddserviceoptions(false);
      }
    };

    if (showAddserviceoptions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAddserviceoptions]);

  useEffect(() => {
    if (brandContext) {
      setFeatureData({
        enableQuiz: brandContext.enableQuiz || false,
        quizName: brandContext.quizName || "",
        enableJobs: brandContext.enableJobs || false,
        enableProducts: brandContext.enableProducts || false,
        enableBooking: brandContext.enableBooking || false,
        enableBlogs: brandContext.enableBlogs || false,
        enableLinks: brandContext.enableLinks !== false,
        enableCommunityOnboarding: true,
        communityName: brandContext.communityName || "",
        enableProfessionalConnect:
          brandContext.enableProfessionalConnect || false,
        enableFriendConnect: brandContext.enableFriendConnect || false,
      });
      setCommunityBrandColors({
        communityPrimaryBrandColor:
          brandContext.communityPrimaryBrandColor ||
          brandContext.primaryBrandColor ||
          "",
        communitySecondaryBrandColor:
          brandContext.communitySecondaryBrandColor ||
          brandContext.secondaryBrandColor ||
          brandContext.primaryBrandColor ||
          "",
      });
      setWidgetLauncherAttention(
        Boolean(brandContext.widgetLauncherEnableAttentionAnimation),
      );
      setWidgetLauncherTexts({
        chatbotWidgetHeader: brandContext.widgetLauncherChatbotHeader || "",
        copyReadMoreUrl: brandContext.assistantCopyReadMoreUrl || "",
      });
      setSupportChannel({
        email: brandContext.supportChannelEmail || "",
        slackUrl: brandContext.supportChannelSlackUrl || "",
      });
    }
  }, [brandContext]);

  const handleSaveCommunityColors = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      const response = await fetch("/api/admin/update-features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: brandContext?.subdomain,
          communityPrimaryBrandColor:
            communityBrandColors.communityPrimaryBrandColor,
          communitySecondaryBrandColor:
            communityBrandColors.communitySecondaryBrandColor,
          primaryBrandColor:
            communityBrandColors.communityPrimaryBrandColor,
          secondaryBrandColor:
            communityBrandColors.communitySecondaryBrandColor,
          communityColorsMatchWidget: false,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save colors");
      }
      await new Promise((r) => setTimeout(r, 400));
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save colors");
      setUpdating(false);
    }
  };

  const handleSaveWidgetChatbotHeader = async () => {
    if (updating || !brandContext?.subdomain) return;
    setUpdating(true);
    try {
      const response = await fetch("/api/admin/update-features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: brandContext.subdomain,
          widgetLauncherChatbotHeader: widgetLauncherTexts.chatbotWidgetHeader,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save widget header");
      }
      await new Promise((r) => setTimeout(r, 400));
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save widget header");
      setUpdating(false);
    }
  };

  const handleSaveWidgetReadMoreUrl = async () => {
    if (updating || !brandContext?.subdomain) return;
    setUpdating(true);
    try {
      const response = await fetch("/api/admin/update-features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: brandContext.subdomain,
          widgetLauncherCopyReadMoreUrl: widgetLauncherTexts.copyReadMoreUrl,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save read-more URL");
      }
      await new Promise((r) => setTimeout(r, 400));
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save read-more URL");
      setUpdating(false);
    }
  };

  const handleSaveSupportChannelEmail = async () => {
    if (updating || !brandContext?.subdomain) return;
    setUpdating(true);
    try {
      const response = await fetch("/api/admin/update-features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: brandContext.subdomain,
          supportChannelEmail: supportChannel.email,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save support email");
      }
      await new Promise((r) => setTimeout(r, 400));
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save support email");
      setUpdating(false);
    }
  };

  const handleSaveSupportChannelSlackUrl = async () => {
    if (updating || !brandContext?.subdomain) return;
    setUpdating(true);
    try {
      const response = await fetch("/api/admin/update-features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: brandContext.subdomain,
          supportChannelSlackUrl: supportChannel.slackUrl,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save Slack URL");
      }
      await new Promise((r) => setTimeout(r, 400));
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save Slack URL");
      setUpdating(false);
    }
  };

  const handleWidgetButtonImageSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || updating || !brandContext?.subdomain) return;
    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subdomain", brandContext.subdomain);
      formData.append("imageType", "widgetLauncherButtonImage");
      const response = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image");
      }
      await new Promise((r) => setTimeout(r, 400));
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to upload image");
      setUpdating(false);
    }
  };

  const handleRemoveWidgetButtonImage = async () => {
    if (updating || !brandContext?.subdomain) return;
    if (
      !confirm(
        "Remove the custom widget button image? The default chat icon will be used.",
      )
    ) {
      return;
    }
    setUpdating(true);
    try {
      const response = await fetch("/api/admin/update-features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: brandContext.subdomain,
          unsetWidgetLauncherButtonImage: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to remove image");
      }
      await new Promise((r) => setTimeout(r, 400));
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to remove image");
      setUpdating(false);
    }
  };

  const handleToggleWidgetLauncherAttention = async (checked) => {
    if (updating || !brandContext?.subdomain) return;
    const prev = widgetLauncherAttention;
    setWidgetLauncherAttention(checked);
    setUpdating(true);
    try {
      const response = await fetch("/api/admin/update-features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: brandContext.subdomain,
          widgetLauncherEnableAttentionAnimation: checked,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update animation setting");
      }
      await new Promise((r) => setTimeout(r, 400));
      window.location.reload();
    } catch (err) {
      console.error(err);
      setWidgetLauncherAttention(prev);
      alert(err.message || "Failed to update animation setting");
      setUpdating(false);
    }
  };

  const handleToggleFeature = async (featureType, value) => {
    if (updating) return;

    // Prevent disabling community feature
    if (featureType === "enableCommunityOnboarding" && value === false) {
      alert(
        "Community feature cannot be disabled. It is always enabled for all brands.",
      );
      return;
    }

    setUpdating(true);
    try {
      const updatePayload = {
        subdomain: brandContext?.subdomain,
        [featureType]: value,
      };

      const response = await fetch("/api/admin/update-features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update feature");
      }

      // Success: keep loading on, wait for Sanity to propagate, then reload once
      await new Promise((r) => setTimeout(r, 400));
      window.location.reload();
    } catch (err) {
      console.error("Error updating feature:", err);
      alert(err.message || "Failed to update feature");
      setUpdating(false);
    }
  };

  const handleSaveFeatureName = async (featureType, name) => {
    if (updating) return;
    setUpdating(true);
    try {
      const updatePayload = {
        subdomain: brandContext?.subdomain,
        [featureType]: name,
      };

      const response = await fetch("/api/admin/update-features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update feature name");
      }

      await new Promise((r) => setTimeout(r, 400));
      window.location.reload();
    } catch (err) {
      console.error("Error updating feature name:", err);
      alert(err.message || "Failed to update feature name");
      setUpdating(false);
    }
  };

  const goToFeature = (path) => {
    if (!path) return;
    router.push(path);
  };

  const GoToButton = ({ path, label, show }) =>
    show ? (
      <button
        type="button"
        onClick={() => goToFeature(path)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-highlight transition-colors hover:bg-muted-bg hover:text-foreground"
        aria-label={`Go to ${label}`}
        title={`Go to ${label}`}
      >
        <ArrowUpRight className="h-4 w-4" />
      </button>
    ) : null;

  return (
    <>
      <div className="min-h-[calc(100vh-56px)] overflow-y-auto bg-background py-8 text-foreground">
        <div className="max-w-6xl mx-auto px-4 md:px-6 font-baloo">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="rounded-lg border border-border bg-card p-2 text-foreground transition-colors hover:bg-muted-bg"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-baloo text-3xl md:text-4xl font-black text-highlight tracking-tight">
                My Services
              </h1>
              <p className="mt-1 text-sm text-muted">
                Manage chatbot services and feature visibility for users.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <div className="flex flex-col gap-6 lg:col-span-5">
              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-baloo text-xl font-bold text-highlight">
                    Chat Services
                  </h2>
                  <span className="text-xs uppercase tracking-wider text-muted">
                    {services.length} active
                  </span>
                </div>

                <div className="space-y-2">
                  {services.length === 0 && (
                    <p className="text-sm text-muted">
                      No services configured yet.
                    </p>
                  )}
                  {services.map((service, index) => (
                    <button
                      key={service._key || index}
                      className="w-full rounded-xl border border-border bg-muted-bg px-4 py-3 text-left transition-colors hover:border-[#2D545E]/30 hover:bg-muted-bg/80"
                      onClick={() => handleEdit(service)}
                    >
                      <p className="text-sm uppercase tracking-wide text-highlight font-medium">
                        {service?.title || service?.name || "Untitled Service"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {service?.name || "service"}
                      </p>
                    </button>
                  ))}
                </div>

                {hasServicesToAdd && (
                  <div className="mt-4 relative" ref={dropdownRef}>
                    <button
                      onClick={() => setshowAddserviceoptions((prev) => !prev)}
                      className="w-full px-4 py-3 rounded-xl border border-dashed border-[#2D545E]/50 text-highlight font-medium hover:bg-[#EEF3F6] transition-colors"
                    >
                      + Add Service
                    </button>
                    {showAddserviceoptions && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                        {availableServices
                          .filter(
                            (item) =>
                              item.allowMultiple ||
                              !availedServices.includes(item.serviceName),
                          )
                          .map((item, index) => (
                            <button
                              key={index}
                              onClick={() => addService(item)}
                              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted-bg"
                            >
                              {item.serviceTitle}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
                <h2 className="font-baloo text-xl font-bold text-highlight">
                  The widget
                </h2>

                <div className="mt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Widget header
                  </h3>
                  <div className="mt-3 space-y-2">
                    <label
                      className="text-xs font-medium text-muted"
                      htmlFor="widget-chatbot-header"
                    >
                      Chatbot widget header
                    </label>
                    <p className="text-xs text-muted">
                      Title in the top bar when the embed chat is open. Leave
                      empty to use the default &quot;{"{Brand}"}&apos;s AI
                      Chat&quot; title.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        id="widget-chatbot-header"
                        type="text"
                        value={widgetLauncherTexts.chatbotWidgetHeader}
                        onChange={(e) =>
                          setWidgetLauncherTexts((p) => ({
                            ...p,
                            chatbotWidgetHeader: e.target.value,
                          }))
                        }
                        disabled={updating}
                        className="min-w-0 flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
                        placeholder="e.g. EntrackrIQ"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={handleSaveWidgetChatbotHeader}
                        disabled={updating}
                        className="shrink-0 text-green-600 hover:text-green-700 disabled:opacity-50"
                        title="Save header"
                        aria-label="Save header"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setWidgetLauncherTexts((p) => ({
                            ...p,
                            chatbotWidgetHeader:
                              brandContext?.widgetLauncherChatbotHeader || "",
                          }))
                        }
                        disabled={updating}
                        className="shrink-0 text-red-600 hover:text-red-700 disabled:opacity-50"
                        title="Reset header"
                        aria-label="Reset header"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t border-border pt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Logo &amp; animation
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    Custom launcher image (optional) and a subtle shake animation
                    so the floating button is easier to notice.
                  </p>
                  <input
                    ref={widgetButtonFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="sr-only"
                    onChange={handleWidgetButtonImageSelected}
                    disabled={updating}
                  />
                  <div className="mt-3 flex w-full min-w-0 flex-row items-center justify-between gap-4">
                    {brandContext?.widgetLauncherButtonImageUrl ? (
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-muted-bg sm:h-28 sm:w-28">
                        <img
                          src={brandContext.widgetLauncherButtonImageUrl}
                          alt="Widget launcher button"
                          className="h-full w-full object-contain p-1"
                        />
                      </div>
                    ) : (
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-muted-bg text-xs text-muted sm:h-28 sm:w-28">
                        Default
                      </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col items-stretch gap-2 sm:flex-none sm:shrink-0 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-end">
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => widgetButtonFileInputRef.current?.click()}
                        className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted-bg disabled:opacity-50 sm:h-auto sm:w-auto sm:justify-start sm:whitespace-normal sm:py-2"
                      >
                        <ImageUp className="h-4 w-4 shrink-0" aria-hidden />
                        Upload image
                      </button>
                      {brandContext?.widgetLauncherButtonImageUrl ? (
                        <button
                          type="button"
                          disabled={updating}
                          onClick={handleRemoveWidgetButtonImage}
                          className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 sm:h-auto sm:w-auto sm:justify-start sm:py-2"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-6 rounded-xl border border-border bg-muted-bg p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Subtle attention animation
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          When enabled, the floating button plays a gentle periodic
                          shake so visitors notice it.
                        </p>
                      </div>
                      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={widgetLauncherAttention}
                          onChange={(e) =>
                            handleToggleWidgetLauncherAttention(e.target.checked)
                          }
                          disabled={updating}
                          className="sr-only peer"
                        />
                        <div className="relative h-6 w-11 rounded-full bg-border peer peer-checked:bg-ring after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-card after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t border-border pt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Read more URL
                  </h3>
                  <div className="mt-3 space-y-2">
                    <label
                      className="text-xs font-medium text-muted"
                      htmlFor="widget-copy-read-more-url"
                    >
                      &quot;Read more&quot; URL for copy to clipboard
                    </label>
                    <p className="text-xs text-muted">
                      Optional. When someone copies a chatbot reply, we add one
                      line at the top that points to this website. Use your main
                      public site, or leave empty to skip that line.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        id="widget-copy-read-more-url"
                        type="url"
                        inputMode="url"
                        value={widgetLauncherTexts.copyReadMoreUrl}
                        onChange={(e) =>
                          setWidgetLauncherTexts((p) => ({
                            ...p,
                            copyReadMoreUrl: e.target.value,
                          }))
                        }
                        disabled={updating}
                        className="min-w-0 flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
                        placeholder="https://yoursite.com"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={handleSaveWidgetReadMoreUrl}
                        disabled={updating}
                        className="shrink-0 text-green-600 hover:text-green-700 disabled:opacity-50"
                        title="Save read-more URL"
                        aria-label="Save read-more URL"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setWidgetLauncherTexts((p) => ({
                            ...p,
                            copyReadMoreUrl:
                              brandContext?.assistantCopyReadMoreUrl || "",
                          }))
                        }
                        disabled={updating}
                        className="shrink-0 text-red-600 hover:text-red-700 disabled:opacity-50"
                        title="Reset read-more URL"
                        aria-label="Reset read-more URL"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t border-border pt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Support channel
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    If you block someone from talking to the avatar, they may need
                    a way to reach you to ask for an unblock. Add an email and/or a
                    Slack link (e.g. channel or workflow URL) your team monitors.
                  </p>
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <label
                        className="text-xs font-medium text-muted"
                        htmlFor="support-channel-email"
                      >
                        Support email
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          id="support-channel-email"
                          type="email"
                          value={supportChannel.email}
                          onChange={(e) =>
                            setSupportChannel((p) => ({
                              ...p,
                              email: e.target.value,
                            }))
                          }
                          disabled={updating}
                          className="min-w-0 flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
                          placeholder="support@yourbrand.com"
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={handleSaveSupportChannelEmail}
                          disabled={updating}
                          className="shrink-0 text-green-600 hover:text-green-700 disabled:opacity-50"
                          title="Save support email"
                          aria-label="Save support email"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSupportChannel((p) => ({
                              ...p,
                              email: brandContext?.supportChannelEmail || "",
                            }))
                          }
                          disabled={updating}
                          className="shrink-0 text-red-600 hover:text-red-700 disabled:opacity-50"
                          title="Reset support email"
                          aria-label="Reset support email"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label
                        className="text-xs font-medium text-muted"
                        htmlFor="support-channel-slack-url"
                      >
                        Slack URL
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          id="support-channel-slack-url"
                          type="url"
                          inputMode="url"
                          value={supportChannel.slackUrl}
                          onChange={(e) =>
                            setSupportChannel((p) => ({
                              ...p,
                              slackUrl: e.target.value,
                            }))
                          }
                          disabled={updating}
                          className="min-w-0 flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
                          placeholder="https://slack.com/..."
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={handleSaveSupportChannelSlackUrl}
                          disabled={updating}
                          className="shrink-0 text-green-600 hover:text-green-700 disabled:opacity-50"
                          title="Save Slack URL"
                          aria-label="Save Slack URL"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSupportChannel((p) => ({
                              ...p,
                              slackUrl: brandContext?.supportChannelSlackUrl || "",
                            }))
                          }
                          disabled={updating}
                          className="shrink-0 text-red-600 hover:text-red-700 disabled:opacity-50"
                          title="Reset Slack URL"
                          aria-label="Reset Slack URL"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6 lg:col-span-7">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-baloo text-xl font-bold text-highlight">
                    Featured Services
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Control what appears on user home and chat selection.
                  </p>
                </div>
                {updating && (
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                    <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    Updating…
                  </span>
                )}
              </div>

              {(featureData.enableQuiz ||
                featureData.enableJobs ||
                featureData.enableProducts ||
                featureData.enableBooking ||
                featureData.enableBlogs ||
                featureData.enableLinks ||
                featureData.enableCommunityOnboarding) && (
                  <div className="mb-5 rounded-xl border border-border bg-muted-bg p-3">
                    <p className="mb-2 text-xs uppercase tracking-widest text-muted">
                      Visible on user side
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {featureData.enableCommunityOnboarding && (
                        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">
                          {featureData.communityName || "Community"}
                        </span>
                      )}
                      {featureData.enableQuiz && (
                        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">
                          {featureData.quizName || "Take a Quiz/Survey"}
                        </span>
                      )}
                      {featureData.enableJobs && (
                        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">
                          Jobs
                        </span>
                      )}
                      {featureData.enableProducts && (
                        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">
                          Products
                        </span>
                      )}
                      {featureData.enableBooking && (
                        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">
                          Bookings
                        </span>
                      )}
                      {featureData.enableBlogs && (
                        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">
                          Blog
                        </span>
                      )}
                      {featureData.enableLinks && (
                        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">
                          Links
                        </span>
                      )}
                    </div>
                  </div>
                )}

              <div
                className={`space-y-4 ${updating ? "pointer-events-none opacity-70" : ""}`}
              >
                <div className="rounded-xl border border-border bg-muted-bg p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium uppercase tracking-wider text-foreground">
                        Community
                      </span>
                      <GoToButton
                        path={`/admin/${brandSubdomain}/my-community`}
                        label="Community"
                        show={true}
                      />
                      <label
                        className="relative inline-flex items-center cursor-not-allowed opacity-70"
                        title="Community feature is always enabled"
                      >
                        <input
                          type="checkbox"
                          checked={true}
                          readOnly
                          disabled
                          className="sr-only peer"
                        />
                        <div className="h-6 w-11 rounded-full bg-ring after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:translate-x-full after:rounded-full after:border after:border-border after:bg-card after:transition-all after:content-['']"></div>
                      </label>
                      <span className="text-xs text-muted">(Always on)</span>
                    </div>

                    {featureData.enableCommunityOnboarding && (
                      <div className="flex items-center gap-2">
                        {editingFeature === "communityName" ? (
                          <>
                            <input
                              type="text"
                              value={featureData.communityName}
                              onChange={(e) =>
                                setFeatureData((prev) => ({
                                  ...prev,
                                  communityName: e.target.value,
                                }))
                              }
                              className="max-w-[240px] rounded-lg border border-border bg-input px-3 py-1.5 text-sm uppercase text-foreground"
                              placeholder="Eg. Connect with other fans"
                              disabled={updating}
                            />
                            <button
                              onClick={() =>
                                handleSaveFeatureName(
                                  "communityName",
                                  featureData.communityName,
                                )
                              }
                              disabled={updating}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingFeature(null);
                                setFeatureData((prev) => ({
                                  ...prev,
                                  communityName:
                                    brandContext?.communityName || "",
                                }));
                              }}
                              disabled={updating}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-normal uppercase tracking-wider text-muted">
                              {featureData.communityName ||
                                "Connect with others"}
                            </span>
                            <button
                              onClick={() => setEditingFeature("communityName")}
                              className="text-muted hover:text-foreground"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 rounded-lg border border-border bg-card px-3 py-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted">
                      Community connection types
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          Professional Connect
                        </span>
                        <span className="text-xs text-muted">
                          Shows "Hire People" &amp; "Find Jobs" buttons
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={featureData.enableProfessionalConnect}
                          onChange={(e) =>
                            handleToggleFeature(
                              "enableProfessionalConnect",
                              e.target.checked,
                            )
                          }
                          disabled={updating}
                          className="sr-only peer"
                        />
                        <div className="h-6 w-11 rounded-full bg-border peer peer-checked:bg-ring after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-card after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          Friend Connect
                        </span>
                        <span className="text-xs text-muted">
                          Shows "Find Friends" button
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={featureData.enableFriendConnect}
                          onChange={(e) =>
                            handleToggleFeature(
                              "enableFriendConnect",
                              e.target.checked,
                            )
                          }
                          disabled={updating}
                          className="sr-only peer"
                        />
                        <div className="h-6 w-11 rounded-full bg-border peer peer-checked:bg-ring after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-card after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>
                    {!featureData.enableProfessionalConnect &&
                      !featureData.enableFriendConnect && (
                        <p className="text-xs text-amber-600 font-medium">
                          Both are off — community section will be hidden for
                          visitors.
                        </p>
                      )}
                  </div>

                  <div className="mt-4 rounded-xl border border-border bg-muted-bg p-4 sm:p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                      Community &amp; widget colors
                    </h3>
                    <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted">
                      Optional. Leave fields empty to keep default Kavisha styling.
                      Primary applies to the Community title, action buttons,
                      Connect, sidebar &apos;New&apos;, and the chat widget launcher.
                      Secondary accents tags and card highlights on Community.
                    </p>
                    <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label
                          className="text-xs font-medium text-muted"
                          htmlFor="community-primary-brand-color"
                        >
                          Primary (hex)
                        </label>
                        <input
                          id="community-primary-brand-color"
                          type="text"
                          value={
                            communityBrandColors.communityPrimaryBrandColor
                          }
                          onChange={(e) =>
                            setCommunityBrandColors((p) => ({
                              ...p,
                              communityPrimaryBrandColor: e.target.value,
                            }))
                          }
                          placeholder="e.g. #2d545e"
                          disabled={updating}
                          autoComplete="off"
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm"
                        />
                        <input
                          type="color"
                          aria-label="Pick primary color"
                          title="Pick primary color"
                          value={
                            normalizeBrandHex(
                              communityBrandColors.communityPrimaryBrandColor,
                            ) || "#2d545e"
                          }
                          onChange={(e) =>
                            setCommunityBrandColors((p) => ({
                              ...p,
                              communityPrimaryBrandColor: e.target.value,
                            }))
                          }
                          disabled={updating}
                          className="h-12 w-12 cursor-pointer overflow-hidden rounded-md border border-border bg-card p-0.5 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:rounded"
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          className="text-xs font-medium text-muted"
                          htmlFor="community-secondary-brand-color"
                        >
                          Secondary (hex)
                        </label>
                        <input
                          id="community-secondary-brand-color"
                          type="text"
                          value={
                            communityBrandColors.communitySecondaryBrandColor
                          }
                          onChange={(e) =>
                            setCommunityBrandColors((p) => ({
                              ...p,
                              communitySecondaryBrandColor: e.target.value,
                            }))
                          }
                          placeholder="e.g. #004A4E"
                          disabled={updating}
                          autoComplete="off"
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm"
                        />
                        <input
                          type="color"
                          aria-label="Pick secondary color"
                          title="Pick secondary color"
                          value={
                            normalizeBrandHex(
                              communityBrandColors.communitySecondaryBrandColor,
                            ) || "#004A4E"
                          }
                          onChange={(e) =>
                            setCommunityBrandColors((p) => ({
                              ...p,
                              communitySecondaryBrandColor: e.target.value,
                            }))
                          }
                          disabled={updating}
                          className="h-12 w-12 cursor-pointer overflow-hidden rounded-md border border-border bg-card p-0.5 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:rounded"
                        />
                      </div>
                    </div>
                    <div className="mt-6 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        disabled={updating}
                        onClick={handleSaveCommunityColors}
                        className="rounded-lg bg-highlight px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                      >
                        Save colors
                      </button>
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() =>
                          setCommunityBrandColors({
                            communityPrimaryBrandColor: "",
                            communitySecondaryBrandColor: "",
                          })
                        }
                        className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-50"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium uppercase tracking-wider text-foreground">
                        Quiz/Survey
                      </span>
                      <GoToButton
                        path="/admin/quiz"
                        label="Quiz/Survey"
                        show={featureData.enableQuiz}
                      />
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={featureData.enableQuiz}
                          onChange={(e) =>
                            handleToggleFeature("enableQuiz", e.target.checked)
                          }
                          disabled={updating}
                          className="sr-only peer"
                        />
                        <div className="h-6 w-11 rounded-full bg-border peer peer-checked:bg-ring after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-card after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>
                    {featureData.enableQuiz && (
                      <div className="flex items-center gap-2">
                        {editingFeature === "quizName" ? (
                          <>
                            <input
                              type="text"
                              value={featureData.quizName}
                              onChange={(e) =>
                                setFeatureData((prev) => ({
                                  ...prev,
                                  quizName: e.target.value,
                                }))
                              }
                              className="max-w-[240px] rounded-lg border border-border bg-input px-3 py-1.5 text-sm uppercase text-foreground"
                              placeholder="Quiz/Survey Name"
                              disabled={updating}
                            />
                            <button
                              onClick={() =>
                                handleSaveFeatureName(
                                  "quizName",
                                  featureData.quizName,
                                )
                              }
                              disabled={updating}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingFeature(null);
                                setFeatureData((prev) => ({
                                  ...prev,
                                  quizName: brandContext?.quizName || "",
                                }));
                              }}
                              disabled={updating}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-normal uppercase tracking-wider text-muted">
                              {featureData.quizName || "Take a Quiz/Survey"}
                            </span>
                            <button
                              onClick={() => setEditingFeature("quizName")}
                              className="text-muted hover:text-foreground"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium uppercase tracking-wider text-foreground">
                        Jobs
                      </span>
                      <GoToButton
                        path={`/admin/jobs?subdomain=${encodeURIComponent(brandSubdomain)}`}
                        label="Jobs"
                        show={featureData.enableJobs}
                      />
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={featureData.enableJobs}
                          onChange={(e) =>
                            handleToggleFeature("enableJobs", e.target.checked)
                          }
                          disabled={updating}
                          className="sr-only peer"
                        />
                        <div className="h-6 w-11 rounded-full bg-border peer peer-checked:bg-ring after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-card after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>
                    <span className="text-xs text-muted">
                      Job listings &amp; applications
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium uppercase tracking-wider text-foreground">
                        Products
                      </span>
                      <GoToButton
                        path={`/admin/products?subdomain=${encodeURIComponent(brandSubdomain)}`}
                        label="Products"
                        show={featureData.enableProducts}
                      />
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={featureData.enableProducts}
                          onChange={(e) =>
                            handleToggleFeature(
                              "enableProducts",
                              e.target.checked,
                            )
                          }
                          disabled={updating}
                          className="sr-only peer"
                        />
                        <div className="h-6 w-11 rounded-full bg-border peer peer-checked:bg-ring after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-card after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>
                    <span className="text-xs text-muted">
                      Store, cart &amp; order history
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium uppercase tracking-wider text-foreground">
                        Bookings
                      </span>
                      <GoToButton
                        path={`/admin/services?subdomain=${encodeURIComponent(brandSubdomain)}`}
                        label="Bookings"
                        show={featureData.enableBooking}
                      />
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={featureData.enableBooking}
                          onChange={(e) =>
                            handleToggleFeature(
                              "enableBooking",
                              e.target.checked,
                            )
                          }
                          disabled={updating}
                          className="sr-only peer"
                        />
                        <div className="h-6 w-11 rounded-full bg-border peer peer-checked:bg-ring after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-card after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>
                    <span className="text-xs text-muted">
                      Bookable services &amp; booking history
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium uppercase tracking-wider text-foreground">
                        Blog
                      </span>
                      <GoToButton
                        path={`/admin/blogs?subdomain=${encodeURIComponent(brandSubdomain)}`}
                        label="Blog"
                        show={featureData.enableBlogs}
                      />
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={featureData.enableBlogs}
                          onChange={(e) =>
                            handleToggleFeature(
                              "enableBlogs",
                              e.target.checked,
                            )
                          }
                          disabled={updating}
                          className="sr-only peer"
                        />
                        <div className="h-6 w-11 rounded-full bg-border peer peer-checked:bg-ring after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-card after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>
                    <span className="text-xs text-muted">
                      Blog posts for users
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium uppercase tracking-wider text-foreground">
                        Links
                      </span>
                      <GoToButton
                        path={`/admin/links?subdomain=${encodeURIComponent(brandSubdomain)}`}
                        label="Links"
                        show={featureData.enableLinks}
                      />
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={featureData.enableLinks}
                          onChange={(e) =>
                            handleToggleFeature(
                              "enableLinks",
                              e.target.checked,
                            )
                          }
                          disabled={updating}
                          className="sr-only peer"
                        />
                        <div className="h-6 w-11 rounded-full bg-border peer peer-checked:bg-ring after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-card after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>
                    <span className="text-xs text-muted">
                      Link tree page &amp; navigation
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <ServiceModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        service={selectedService}
        addNewservice={addNewservice}
      />
    </>
  );
}
