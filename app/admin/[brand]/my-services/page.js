"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Edit2, Check, X } from "lucide-react";
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
    enableCommunityOnboarding: true,
    communityName: brandContext?.communityName || "",
    enableProfessionalConnect: brandContext?.enableProfessionalConnect || false,
    enableFriendConnect: brandContext?.enableFriendConnect || false,
  });
  const [updating, setUpdating] = useState(false);

  const services = brandContext?.services || [];
  const availedServices = services.map((item) => item.name) || [];

  const availableServices = [
    { serviceName: "lead_journey", serviceTitle: "Talk to me", allowMultiple: true },
    { serviceName: "pitch_to_investor", serviceTitle: "Pitch to me" },
    { serviceName: "job_seeker", serviceTitle: "Work with me" },
  ];
  const hasServicesToAdd = availableServices.some(
    (item) => item.allowMultiple || !availedServices.includes(item.serviceName)
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
        enableCommunityOnboarding: true,
        communityName: brandContext.communityName || "",
        enableProfessionalConnect: brandContext.enableProfessionalConnect || false,
        enableFriendConnect: brandContext.enableFriendConnect || false,
      });
    }
  }, [brandContext]);

  const handleToggleFeature = async (featureType, value) => {
    if (updating) return;

    // Prevent disabling community feature
    if (featureType === "enableCommunityOnboarding" && value === false) {
      alert("Community feature cannot be disabled. It is always enabled for all brands.");
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

      setFeatureData((prev) => ({ ...prev, [featureType]: value }));
      window.location.reload();
    } catch (err) {
      console.error("Error updating feature:", err);
      alert(err.message || "Failed to update feature");
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveFeatureName = async (featureType, name) => {
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

      setFeatureData((prev) => ({ ...prev, [featureType]: name }));
      setEditingFeature(null);
      window.location.reload();
    } catch (err) {
      console.error("Error updating feature name:", err);
      alert(err.message || "Failed to update feature name");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <div className="bg-[#F5F7FA] min-h-[calc(100vh-56px)] overflow-y-auto py-8">
        <div className="max-w-6xl mx-auto px-4 md:px-6 font-akshar">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-zen text-3xl md:text-4xl font-black text-[#000A67] tracking-tight">
                My Services
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage chatbot services and feature visibility for users.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl shadow-sm p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-zen text-xl font-bold text-[#000A67]">Configured Services</h2>
                <span className="text-xs uppercase tracking-wider text-gray-400">
                  {services.length} active
                </span>
              </div>

              <div className="space-y-2">
                {services.length === 0 && (
                  <p className="text-sm text-gray-500">No services configured yet.</p>
                )}
                {services.map((service, index) => (
                  <button
                    key={service._key || index}
                    className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-[#EEF3F6] hover:border-[#2D545E]/30 transition-colors"
                    onClick={() => handleEdit(service)}
                  >
                    <p className="text-sm uppercase tracking-wide text-[#2D545E] font-medium">
                      {service?.title || service?.name || "Untitled Service"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{service?.name || "service"}</p>
                  </button>
                ))}
              </div>

              {hasServicesToAdd && (
                <div className="mt-4 relative" ref={dropdownRef}>
                  <button
                    onClick={() => setshowAddserviceoptions((prev) => !prev)}
                    className="w-full px-4 py-3 rounded-xl border border-dashed border-[#2D545E]/50 text-[#2D545E] font-medium hover:bg-[#EEF3F6] transition-colors"
                  >
                    + Add Service
                  </button>
                  {showAddserviceoptions && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                      {availableServices
                        .filter(
                          (item) =>
                            item.allowMultiple ||
                            !availedServices.includes(item.serviceName)
                        )
                        .map((item, index) => (
                          <button
                            key={index}
                            onClick={() => addService(item)}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm"
                          >
                            {item.serviceTitle}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl shadow-sm p-5 md:p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-zen text-xl font-bold text-[#000A67]">Feature Settings</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Control what appears on user home and chat selection.
                  </p>
                </div>
                {updating && (
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Updating...
                  </span>
                )}
              </div>

              {(featureData.enableQuiz || featureData.enableJobs || featureData.enableProducts || featureData.enableCommunityOnboarding) && (
                <div className="mb-5 p-3 rounded-xl bg-[#F8FBFC] border border-[#2D545E]/15">
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Visible on user side</p>
                  <div className="flex flex-wrap gap-2">
                    {featureData.enableCommunityOnboarding && (
                      <span className="px-3 py-1 rounded-full text-xs bg-white border border-gray-200 text-gray-700">
                        {featureData.communityName || "Community"}
                      </span>
                    )}
                    {featureData.enableQuiz && (
                      <span className="px-3 py-1 rounded-full text-xs bg-white border border-gray-200 text-gray-700">
                        {featureData.quizName || "Take a Quiz/Survey"}
                      </span>
                    )}
                    {featureData.enableJobs && (
                      <span className="px-3 py-1 rounded-full text-xs bg-white border border-gray-200 text-gray-700">
                        Jobs
                      </span>
                    )}
                    {featureData.enableProducts && (
                      <span className="px-3 py-1 rounded-full text-xs bg-white border border-gray-200 text-gray-700">
                        Products
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className={`space-y-4 ${updating ? "pointer-events-none opacity-70" : ""}`}>
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-700 uppercase text-sm tracking-wider font-medium">
                        Community
                      </span>
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
                        <div className="w-11 h-6 bg-blue-600 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-white after:rounded-full after:h-5 after:w-5 after:transition-all after:translate-x-full"></div>
                      </label>
                      <span className="text-xs text-gray-400">(Always on)</span>
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
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg uppercase max-w-[240px]"
                              placeholder="Eg. Connect with other fans"
                              disabled={updating}
                            />
                            <button
                              onClick={() =>
                                handleSaveFeatureName(
                                  "communityName",
                                  featureData.communityName
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
                                  communityName: brandContext?.communityName || "",
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
                            <span className="text-gray-600 uppercase text-xs tracking-wider font-normal">
                              {featureData.communityName || "Connect with others"}
                            </span>
                            <button
                              onClick={() => setEditingFeature("communityName")}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 px-3 py-3 bg-white rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                      Community connection types
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-700 font-medium">Professional Connect</span>
                        <span className="text-xs text-gray-400">Shows "Hire People" &amp; "Find Jobs" buttons</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={featureData.enableProfessionalConnect}
                          onChange={(e) => handleToggleFeature("enableProfessionalConnect", e.target.checked)}
                          disabled={updating}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-700 font-medium">Friend Connect</span>
                        <span className="text-xs text-gray-400">Shows "Find Friends" button</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={featureData.enableFriendConnect}
                          onChange={(e) => handleToggleFeature("enableFriendConnect", e.target.checked)}
                          disabled={updating}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>
                    {!featureData.enableProfessionalConnect && !featureData.enableFriendConnect && (
                      <p className="text-xs text-amber-600 font-medium">
                        Both are off — community section will be hidden for visitors.
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-700 uppercase text-sm tracking-wider font-medium">
                        Quiz/Survey
                      </span>
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
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
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
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg uppercase max-w-[240px]"
                              placeholder="Quiz/Survey Name"
                              disabled={updating}
                            />
                            <button
                              onClick={() =>
                                handleSaveFeatureName("quizName", featureData.quizName)
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
                            <span className="text-gray-600 uppercase text-xs tracking-wider font-normal">
                              {featureData.quizName || "Take a Quiz/Survey"}
                            </span>
                            <button
                              onClick={() => setEditingFeature("quizName")}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-700 uppercase text-sm tracking-wider font-medium">
                        Jobs
                      </span>
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
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>
                    <span className="text-xs text-gray-400">Job listings &amp; applications</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-700 uppercase text-sm tracking-wider font-medium">
                        Products
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={featureData.enableProducts}
                          onChange={(e) =>
                            handleToggleFeature("enableProducts", e.target.checked)
                          }
                          disabled={updating}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>
                    <span className="text-xs text-gray-400">Store, cart &amp; order history</span>
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
