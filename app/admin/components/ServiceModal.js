"use client";
import { ArrowLeft, User, Settings } from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function ServiceModal({
  isOpen,
  onClose,
  service,
  addNewservice = false,
}) {
  const router = useRouter();
  const brand = useBrandContext();
  const availedServices = brand?.services?.map((item) => item.name) || [];
  const [formData, setFormData] = useState({
    serviceTitle: "",
    serviceName: "",
    welcomingMessage: "",
    intro: "",
    voice: "",
    behaviour: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Populate form when service is provided
  useEffect(() => {
    if (service) {
      // Parse prompt to extract personality parts if needed
      // For now, we'll use the service data directly
      setFormData({
        serviceTitle: service.title || "",
        serviceName: service.name || "",
        welcomingMessage: service.initialMessage || "",
        intro: service.intro || "",
        voice: service.voice || "",
        behaviour: service.behaviour || "",
      });
    } else {
      // Reset form for new service
      setFormData({
        serviceTitle: "",
        serviceName: "",
        welcomingMessage: "",
        intro: "",
        voice: "",
        behaviour: "",
      });
    }
  }, [service]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    setError("");

    try {
      const serviceData = {
        name: service?.name || formData.serviceName,
        title: formData.serviceTitle,
        initialMessage: formData.welcomingMessage,
        intro: formData.intro,
        voice: formData.voice,
        behaviour: formData.behaviour,
      };

      const payload = {
        brandName: brand?.subdomain,
        serviceData,
      };

      // If editing existing service, add serviceName to payload
      if (service?.name) {
        payload.serviceName = service.name;
      }

      const method = service?.name ? "PATCH" : "POST";
      const response = await fetch("/api/admin/edit-services", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save service");
      }

      // Success - close modal and refresh
      onClose();
      // Optionally refresh the page or update context
      window.location.reload();
    } catch (err) {
      setError(err.message || "An error occurred while saving");
      console.error("Error saving service:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const serviceName = service?.title || "";

  const availableServices = [
    { serviceName: "lead_journey", serviceTitle: "Talk to me" },
    { serviceName: "pitch_to_me", serviceTitle: "Pitch to me" },
    { serviceName: "job_seeker", serviceTitle: "Work with me" },
    // { serviceName: "buy_my_product", serviceTitle: "Buy my product" },
  ];

  const allServicesAvailed = availedServices.length >= availableServices.length;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Back button */}
          <button
            onClick={onClose}
            className="mb-6 text-black hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          {/* Title */}
          {allServicesAvailed && (
            <div>
              {" "}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-800 text-sm">
                  You have availed all the services.
                </p>
              </div>
            </div>
          )}
          {!allServicesAvailed && (
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-purple-900 mb-12 text-center leading-tight tracking-tight normal-case font-mono">
                {addNewservice ? "Add a service" : serviceName}
              </h1>

              {/* Form */}
              <div className="space-y-8">
                {/* Service title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service title
                  </label>
                  <input
                    type="text"
                    value={formData.serviceTitle}
                    onChange={(e) =>
                      handleChange("serviceTitle", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Enter service title"
                  />
                </div>

                {/* Service type dropdown - only show when adding new service */}
                {addNewservice && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Type
                    </label>
                    <select
                      value={formData.serviceName || ""}
                      onChange={(e) => {
                        const selectedService = availableServices.find(
                          (item) => item.serviceName === e.target.value
                        );
                        setFormData((prev) => ({
                          ...prev, // Preserve existing fields
                          serviceName: e.target.value,
                          serviceTitle: selectedService?.serviceTitle || "",
                        }));
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Select a service type</option>
                      {availableServices.map((item, index) => {
                        return (
                          <option
                            key={index}
                            value={item.serviceName}
                            disabled={availedServices?.includes(
                              item.serviceName
                            )}
                          >
                            {item.serviceTitle}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Welcoming message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Welcoming message
                  </label>
                  <textarea
                    rows="4"
                    value={formData.welcomingMessage}
                    onChange={(e) =>
                      handleChange("welcomingMessage", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                    placeholder="Enter welcoming message"
                  />
                </div>

                {/* Personality core */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Personality core
                  </label>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Intro
                      </label>
                      <textarea
                        rows="4"
                        value={formData.intro}
                        onChange={(e) => handleChange("intro", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                        placeholder="Enter intro"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voice
                      </label>
                      <textarea
                        rows="4"
                        value={formData.voice}
                        onChange={(e) => handleChange("voice", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                        placeholder="Enter voice"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Behaviour
                      </label>
                      <textarea
                        rows="4"
                        value={formData.behaviour}
                        onChange={(e) =>
                          handleChange("behaviour", e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                        placeholder="Enter behaviour"
                      />
                    </div>
                  </div>
                </div>

                {/* Error message */}
                {error && <div className="text-red-600 text-sm">{error}</div>}

                {/* Save/Update button */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-8 py-2 bg-blue-300 text-white uppercase font-medium hover:bg-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "SAVING..." : service?.name ? "UPDATE" : "SAVE"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Footer */}
      <div className="w-full h-12 flex items-center justify-center">
        <p className="text-black text-sm">Powered by KAVISHA</p>
      </div>
    </div>
  );
}
