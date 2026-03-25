"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Edit2, Check, X, ArrowUpRight } from "lucide-react";
import ServiceModal from "@/app/admin/components/ServiceModal";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

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
    enableCommunityOnboarding: true,
    communityName: brandContext?.communityName || "",
    enableProfessionalConnect: brandContext?.enableProfessionalConnect || false,
    enableFriendConnect: brandContext?.enableFriendConnect || false,
  });
  const [updating, setUpdating] = useState(false);
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
        enableCommunityOnboarding: true,
        communityName: brandContext.communityName || "",
        enableProfessionalConnect:
          brandContext.enableProfessionalConnect || false,
        enableFriendConnect: brandContext.enableFriendConnect || false,
      });
    }
  }, [brandContext]);

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
        <div className="max-w-6xl mx-auto px-4 md:px-6 font-akshar">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="rounded-lg border border-border bg-card p-2 text-foreground transition-colors hover:bg-muted-bg"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-zen text-3xl md:text-4xl font-black text-highlight tracking-tight">
                My Services
              </h1>
              <p className="mt-1 text-sm text-muted">
                Manage chatbot services and feature visibility for users.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6 lg:col-span-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-zen text-xl font-bold text-highlight">
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

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6 lg:col-span-7">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-zen text-xl font-bold text-highlight">
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
