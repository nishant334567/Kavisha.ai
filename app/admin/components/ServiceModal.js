"use client";
import { ArrowLeft, Trash2, Info } from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useState, useEffect } from "react";
import ProductModal from "./ProductModal";
import ServiceModalForBuy from "./ServiceModalForBuy";
import { BEHAVIOUR_TEMPLATES } from "@/app/make-avatar/v2/behaviourTemplates";

export default function ServiceModal({
  isOpen,
  onClose,
  service,
  addNewservice = false,
}) {
  const brand = useBrandContext();

  const [showProductModal, setShowProductModal] = useState(false);
  const [showServiceModalForBuy, setShowServiceModalForBuy] = useState(false);
  const [templateId, setTemplateId] = useState("custom");
  const [infoSection, setInfoSection] = useState(null);

  const PERSONALITY_INFO = {
    about: "Who you are — background, expertise, interests, and the tone you want. Helps the AI understand your persona.",
    behaviour: "How the AI should behave — tone, style, personality traits, how it responds. The 'how' it speaks and interacts.",
    rules: "Constraints and guidelines — what to avoid, what to stay on topic about. E.g. don't use slang, stay professional.",
  };
  const [formData, setFormData] = useState({
    serviceTitle: "",
    serviceName: "",
    welcomingMessage: "",
    about: "",
    behaviour: "",
    rules: "",
    introquestions: [],
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Populate form when service is provided
  useEffect(() => {
    if (service) {
      if (addNewservice) {
        setTemplateId("custom");
        setFormData({
          serviceTitle: service.title || "",
          serviceName: service.name || "",
          welcomingMessage: "",
          about: "",
          behaviour: "",
          rules: "",
          introquestions: [],
        });
      } else {
        const qs = Array.isArray(service.introquestions) ? service.introquestions.slice(0, 5) : [];
        setFormData({
          serviceTitle: service.title || "",
          serviceName: service.name || "",
          welcomingMessage: service.initialMessage || "",
          about: service.about || "",
          behaviour: service.behaviour || "",
          rules: service.rules || "",
          introquestions: qs,
        });
      }
    } else {
      setFormData({
        serviceTitle: "",
        serviceName: "",
        welcomingMessage: "",
        about: "",
        behaviour: "",
        rules: "",
        introquestions: [],
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
        about: formData.about,
        behaviour: formData.behaviour,
        rules: formData.rules,
        introquestions: (formData.introquestions || []).slice(0, 5).filter((q) => typeof q === "string" && q.trim() !== ""),
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

              {/* Template (only for new Talk to me) */}
              {addNewservice && service?.name === "lead_journey" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start from template
                  </label>
                  <select
                    value={templateId}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTemplateId(value);
                      if (value === "custom") {
                        setFormData((prev) => ({ ...prev, about: "", behaviour: "", rules: "" }));
                      } else {
                        const t = BEHAVIOUR_TEMPLATES.find((x) => x.id === value);
                        if (t) {
                          setFormData((prev) => ({
                            ...prev,
                            behaviour: t.behaviour,
                            rules: t.rules,
                          }));
                        }
                      }
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  >
                    {BEHAVIOUR_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                    <option value="custom">Custom (start from scratch)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Pick a template to pre-fill behaviour & rules, or start custom. You can edit after selecting.
                  </p>
                </div>
              )}

              {/* Personality core — three separate sections like create avatar */}
              <div className="space-y-6">
                <p className="text-sm font-medium text-gray-700">Personality Core</p>

                {/* About */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-gray-700">About</label>
                    <button
                      type="button"
                      onClick={() => setInfoSection((s) => (s === "about" ? null : "about"))}
                      className="p-0.5 rounded-full hover:bg-gray-200 text-gray-500 hover:text-purple-600 transition-colors"
                      aria-label="About this section"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                  {infoSection === "about" && (
                    <p className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 mb-2">
                      {PERSONALITY_INFO.about}
                    </p>
                  )}
                  <textarea
                    rows={4}
                    value={formData.about || ""}
                    onChange={(e) => handleChange("about", e.target.value)}
                    placeholder="Enter about..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none bg-white text-sm"
                  />
                </div>

                {/* Behaviour */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-gray-700">Behaviour</label>
                    <button
                      type="button"
                      onClick={() => setInfoSection((s) => (s === "behaviour" ? null : "behaviour"))}
                      className="p-0.5 rounded-full hover:bg-gray-200 text-gray-500 hover:text-purple-600 transition-colors"
                      aria-label="About behaviour"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                  {infoSection === "behaviour" && (
                    <p className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 mb-2">
                      {PERSONALITY_INFO.behaviour}
                    </p>
                  )}
                  <textarea
                    rows={6}
                    value={formData.behaviour || ""}
                    onChange={(e) => handleChange("behaviour", e.target.value)}
                    placeholder="Enter behaviour..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none bg-white text-sm"
                  />
                </div>

                {/* Rules */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-gray-700">Rules</label>
                    <button
                      type="button"
                      onClick={() => setInfoSection((s) => (s === "rules" ? null : "rules"))}
                      className="p-0.5 rounded-full hover:bg-gray-200 text-gray-500 hover:text-purple-600 transition-colors"
                      aria-label="About rules"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                  {infoSection === "rules" && (
                    <p className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 mb-2">
                      {PERSONALITY_INFO.rules}
                    </p>
                  )}
                  <textarea
                    rows={6}
                    value={formData.rules || ""}
                    onChange={(e) => handleChange("rules", e.target.value)}
                    placeholder="Enter rules..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none bg-white text-sm"
                  />
                </div>
              </div>

              {/* Initial Questions (up to 5) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Questions (up to 5)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Shown as quick prompts when the chat has 0–1 messages. Users can tap to send.
                </p>
                {(formData.introquestions || []).map((q, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={q}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          introquestions: (prev.introquestions || []).map((v, j) =>
                            j === i ? e.target.value : v
                          ),
                        }))
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                      placeholder={`Question ${i + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          introquestions: (prev.introquestions || []).filter((_, j) => j !== i),
                        }))
                      }
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      aria-label="Remove question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(formData.introquestions || []).length < 5 && (
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        introquestions: [...(prev.introquestions || []), ""].slice(0, 5),
                      }))
                    }
                    className="mt-1 px-3 py-1.5 text-sm border border-gray-300 rounded bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors"
                  >
                    + Add question
                  </button>
                )}
              </div>

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
