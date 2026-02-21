"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Edit2, Check, X } from "lucide-react";
import ServiceModal from "@/app/admin/components/ServiceModal";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

export default function MyServices() {
  const params = useParams();
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
    { serviceName: "buy_my_product", serviceTitle: "Buy my product" },
    { serviceName: "buy_my_service", serviceTitle: "Buy my service" },
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
        enableCommunityOnboarding: true,
        communityName: brandContext.communityName || "",
        enableProfessionalConnect: brandContext.enableProfessionalConnect || false,
        enableFriendConnect: brandContext.enableFriendConnect || false,
      });
    }
  }, [brandContext]);

  const handleToggleFeature = async (featureType, value) => {
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
      <div className="bg-white h-[calc(100vh-56px)] overflow-y-auto flex items-start justify-center relative py-8">
        <div className="absolute top-4 left-6 z-10">
          <button
            onClick={() => router.back()}
            className="text-black hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-4 font-akshar w-full max-w-2xl px-4">
          <div className="text-center mb-8">
            <h1 className="uppercase font-zen text-3xl md:text-4xl font-black text-[#000A67] leading-tight tracking-tight">
              My services
            </h1>
          </div>

          {/* Services Section */}
          <div className="flex flex-col items-center gap-4 font-akshar mb-8">
            {services.map((service, index) => (
              <div key={service._key || index}>
                <button
                  className="text-gray-600 uppercase text-base tracking-wider font-normal relative pb-1 w-fit hover:opacity-60 transition-opacity"
                  onClick={() => handleEdit(service)}
                >
                  {service?.title || service?.name || "Untitled Service"}
                </button>
                <div className="h-[0.5px] w-[40px] mx-auto bg-slate-400 my-4"></div>
              </div>
            ))}
            {hasServicesToAdd && (
              <div className="relative" ref={dropdownRef}>
                <div>
                  <button
                    onClick={() => setshowAddserviceoptions((prev) => !prev)}
                    className="text-gray-600 uppercase text-base tracking-wider font-normal relative pb-1 w-fit hover:opacity-60 transition-opacity"
                  >
                    ADD SERVICES
                  </button>

                </div>
                {showAddserviceoptions && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
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
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg text-sm"
                        >
                          {item.serviceTitle}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Featured Services Section - Show enabled features */}
          {(featureData.enableQuiz || featureData.enableCommunityOnboarding) && (
            <div className="flex flex-col items-center gap-4 font-akshar mt-4 border-gray-300">
              <h2 className="uppercase font-zen text-xl md:text-2xl font-bold text-[#000A67] mb-4">
                Featured Services
              </h2>
              {featureData.enableQuiz && (
                <div className="flex flex-col items-center">
                  <span className="text-gray-600 uppercase text-base tracking-wider font-normal">
                    {featureData.quizName || "Take a Quiz/Survey"}
                  </span>
                  <div className="h-[0.5px] w-[40px] mx-auto bg-slate-400 my-4"></div>
                </div>
              )}
              {featureData.enableCommunityOnboarding && (
                <div className="flex flex-col items-center">
                  <span className="text-gray-600 uppercase text-base tracking-wider font-normal">
                    {featureData.communityName || "Connect with others"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Features Configuration Section */}
          <div className="flex flex-col items-center gap-6 font-akshar mt-12 pt-8 border-t-2 border-gray-300">
            <h2 className="uppercase font-zen text-xl md:text-2xl font-bold text-[#000A67] mb-2">
              Features
            </h2>

            {/* Community Feature - Always Enabled */}
            <div className="flex items-center justify-between w-full gap-4 px-4">
              <div className="flex items-center gap-3">
                <span className="text-gray-600 uppercase text-base tracking-wider font-normal">
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
                <div className="flex items-center gap-2 flex-1 justify-end">
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
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg text-center uppercase max-w-[200px]"
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
                      <span className="text-gray-600 uppercase text-sm tracking-wider font-normal">
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

            {/* Community sub-toggles */}
            <div className="w-full flex flex-col gap-3 px-8 py-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Community connection types</p>
              {/* Professional Connect */}
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
              {/* Friend Connect */}
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
                <p className="text-xs text-amber-600 font-medium">⚠ Both are off — community section will be hidden for visitors.</p>
              )}
            </div>

            {/* Quiz/Survey Feature */}
            <div className="flex items-center justify-between w-full gap-4 px-4">
              <div className="flex items-center gap-3">
                <span className="text-gray-600 uppercase text-base tracking-wider font-normal">
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
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              {featureData.enableQuiz && (
                <div className="flex items-center gap-2 flex-1 justify-end">
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
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg text-center uppercase max-w-[200px]"
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
                      <span className="text-gray-600 uppercase text-sm tracking-wider font-normal">
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
