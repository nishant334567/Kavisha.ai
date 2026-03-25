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
    <div className="fixed inset-0 z-50 flex h-screen flex-col bg-background text-foreground">
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Back button and Delete (when editing) */}
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-foreground transition-opacity hover:opacity-70"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            {!addNewservice && service && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                title="Delete service"
                className="inline-flex items-center justify-center rounded-lg border border-red-200 p-1.5 text-red-700 transition-colors hover:bg-muted-bg disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

          <div>
            <h1 className="mb-12 text-center font-mono text-4xl font-black leading-tight tracking-tight text-highlight normal-case md:text-5xl">
              {addNewservice ? "Add a service" : serviceName}
            </h1>

            {/* Form */}
            <div className="space-y-8">
              {/* Service title */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Service title
                </label>
                <input
                  type="text"
                  value={formData.serviceTitle}
                  onChange={(e) => handleChange("serviceTitle", e.target.value)}
                  className="w-full rounded border border-border bg-input px-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Enter service title"
                />
              </div>

              {/* Welcoming message */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Welcoming message
                </label>
                <textarea
                  rows="4"
                  value={formData.welcomingMessage}
                  onChange={(e) =>
                    handleChange("welcomingMessage", e.target.value)
                  }
                  className="w-full resize-none rounded border border-border bg-input px-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Enter welcoming message"
                />
              </div>

              {/* Template (only for new Talk to me) */}
              {addNewservice && service?.name === "lead_journey" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
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
                    className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {BEHAVIOUR_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                    <option value="custom">Custom (start from scratch)</option>
                  </select>
                  <p className="mt-1 text-xs text-muted">
                    Pick a template to pre-fill behaviour & rules, or start custom. You can edit after selecting.
                  </p>
                </div>
              )}

              {/* Personality core — three separate sections like create avatar */}
              <div className="space-y-6">
                <p className="text-sm font-medium text-foreground">Personality Core</p>

                {/* About */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-foreground">About</label>
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
                    value={formData.about || ""}
                    onChange={(e) => handleChange("about", e.target.value)}
                    placeholder="Enter about..."
                    className="w-full resize-none rounded-lg border border-border bg-input px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                {/* Behaviour */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-foreground">Behaviour</label>
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
                    <p className="mb-2 rounded-lg border border-border bg-muted-bg px-3 py-2 text-xs text-muted">
                      {PERSONALITY_INFO.behaviour}
                    </p>
                  )}
                  <textarea
                    rows={6}
                    value={formData.behaviour || ""}
                    onChange={(e) => handleChange("behaviour", e.target.value)}
                    placeholder="Enter behaviour..."
                    className="w-full resize-none rounded-lg border border-border bg-input px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                {/* Rules */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-foreground">Rules</label>
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
                    <p className="mb-2 rounded-lg border border-border bg-muted-bg px-3 py-2 text-xs text-muted">
                      {PERSONALITY_INFO.rules}
                    </p>
                  )}
                  <textarea
                    rows={6}
                    value={formData.rules || ""}
                    onChange={(e) => handleChange("rules", e.target.value)}
                    placeholder="Enter rules..."
                    className="w-full resize-none rounded-lg border border-border bg-input px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Initial Questions (up to 5) */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Initial Questions (up to 5)
                </label>
                <p className="mb-2 text-xs text-muted">
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
                      className="flex-1 rounded border border-border bg-input px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
                      className="rounded p-2 text-red-600 transition-colors hover:bg-muted-bg"
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
                    className="mt-1 rounded border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted-bg"
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
                    className="rounded bg-muted-bg px-4 py-2 text-foreground transition-colors hover:bg-card"
                    >
                      My Products
                    </button>
                  )}
                {(service?.name === "buy_my_service" ||
                  formData.serviceName === "buy_my_service") && (
                    <button
                      onClick={() => setShowServiceModalForBuy(true)}
                    className="rounded bg-muted-bg px-4 py-2 text-foreground transition-colors hover:bg-card"
                    >
                      My Services
                    </button>
                  )}
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="rounded-lg bg-highlight px-8 py-3 font-semibold uppercase text-white shadow-md transition-all hover:opacity-90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
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
        <p className="text-sm text-muted">Powered by KAVISHA</p>
      </div>
    </div>
  );
}
