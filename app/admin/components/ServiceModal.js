"use client";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useState, useEffect } from "react";
import ProductModal from "./ProductModal";
import ServiceModalForBuy from "./ServiceModalForBuy";

export default function ServiceModal({
  isOpen,
  onClose,
  service,
  addNewservice = false,
}) {
  const brand = useBrandContext();

  const [showProductModal, setShowProductModal] = useState(false);
  const [showServiceModalForBuy, setShowServiceModalForBuy] = useState(false);
  const [personalitytype, setPersonalitytype] = useState("intro");
  const [formData, setFormData] = useState({
    serviceTitle: "",
    serviceName: "",
    welcomingMessage: "",
    intro: "",
    voice: "",
    behaviour: "",
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Populate form when service is provided
  useEffect(() => {
    if (service) {
      if (addNewservice) {
        // For new service, pre-populate only title and name, leave rest blank
        setFormData({
          serviceTitle: service.title || "",
          serviceName: service.name || "",
          welcomingMessage: "",
          intro: "",
          voice: "",
          behaviour: "",
        });
      } else {
        // For editing existing service, populate all fields
        setFormData({
          serviceTitle: service.title || "",
          serviceName: service.name || "",
          welcomingMessage: service.initialMessage || "",
          intro: service.intro || "",
          voice: service.voice || "",
          behaviour: service.behaviour || "",
        });
      }
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
  }, [service, addNewservice]);

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

      // If editing existing service (not adding new), add serviceName and serviceKey to payload
      // serviceKey is required when multiple services share the same name (e.g. lead_journey)
      if (service?.name && !addNewservice) {
        payload.serviceName = service.name;
        if (service._key) payload.serviceKey = service._key;
      }

      const method = service?.name && !addNewservice ? "PATCH" : "POST";
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

  const handleDelete = async () => {
    if (!service || addNewservice) return;
    if (!confirm("Are you sure you want to delete this service? This cannot be undone."))
      return;
    setDeleting(true);
    setError("");
    try {
      const payload = {
        brandName: brand?.subdomain,
        serviceName: service.name,
      };
      if (service._key) payload.serviceKey = service._key;
      const res = await fetch("/api/admin/edit-services", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete service");
      onClose();
      window.location.reload();
    } catch (err) {
      setError(err.message || "Failed to delete service");
      console.error("Delete service error:", err);
    } finally {
      setDeleting(false);
    }
  };

  const serviceName = service?.title || "";

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Back button and Delete (when editing) */}
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-black hover:opacity-70 transition-opacity"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            {!addNewservice && service && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                title="Delete service"
                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

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
                  onChange={(e) => handleChange("serviceTitle", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Enter service title"
                />
              </div>

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
                <p className="mb-3 text-sm font-medium text-gray-700">
                  Personality Core
                </p>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setPersonalitytype("intro")}
                    className={`flex-1 py-2.5 rounded-lg font-medium text-xs transition-all ${
                      personalitytype === "intro"
                        ? "bg-purple-900 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Intro
                  </button>
                  <button
                    onClick={() => setPersonalitytype("voice")}
                    className={`flex-1 py-2.5 rounded-lg font-medium text-xs transition-all ${
                      personalitytype === "voice"
                        ? "bg-purple-900 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Voice
                  </button>
                  <button
                    onClick={() => setPersonalitytype("behaviour")}
                    className={`flex-1 py-2.5 rounded-lg font-medium text-xs transition-all ${
                      personalitytype === "behaviour"
                        ? "bg-purple-900 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Behaviour
                  </button>
                </div>
              </div>
              <textarea
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none bg-white shadow-sm"
                value={formData[personalitytype] || ""}
                onChange={(e) => handleChange(personalitytype, e.target.value)}
                rows={10}
                placeholder={`Enter ${personalitytype}...`}
              />
              {/* Error message */}
              {error && <div className="text-red-600 text-sm">{error}</div>}

              {/* Save/Update button */}
              <div className="flex justify-between pt-4">
                {(service?.name === "buy_my_product" ||
                  formData.serviceName === "buy_my_product") && (
                  <button
                    onClick={() => setShowProductModal(true)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                  >
                    My Products
                  </button>
                )}
                {(service?.name === "buy_my_service" ||
                  formData.serviceName === "buy_my_service") && (
                  <button
                    onClick={() => setShowServiceModalForBuy(true)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                  >
                    My Services
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-8 py-3 bg-purple-900 text-white uppercase font-semibold rounded-lg hover:bg-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-purple-600"
                >
                  {loading ? "SAVING..." : service?.name ? "UPDATE" : "SAVE"}
                </button>
              </div>
              {showProductModal && (
                <ProductModal
                  isOpen={showProductModal}
                  onClose={() => setShowProductModal(false)}
                />
              )}
              {showServiceModalForBuy && (
                <ServiceModalForBuy
                  isOpen={showServiceModalForBuy}
                  onClose={() => setShowServiceModalForBuy(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Footer */}
      <div className="w-full h-12 flex items-center justify-center">
        <p className="text-black text-sm">Powered by KAVISHA</p>
      </div>
    </div>
  );
}
