"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

export default function ServiceModalForBuy({ isOpen, onClose }) {
  const brand = useBrandContext();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [selectedService, setSelectedService] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [editingService, setEditingService] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchServices();
    }
  }, [isOpen, brand?.subdomain]);

  const fetchServices = async () => {
    if (!brand?.subdomain) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/services?brand=${brand.subdomain}`
      );
      const data = await response.json();
      if (response.ok) {
        setServices(data.services || []);
      }
    } catch (error) {
      console.error("Failed to fetch services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async () => {
    if (!formData.name.trim()) {
      alert("Service name is required");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          brand: brand?.subdomain,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setFormData({ name: "", description: "" });
        fetchServices();
      } else {
        alert(data.error || "Failed to add service");
      }
    } catch (error) {
      console.error("Error adding service:", error);
      alert("Failed to add service");
    } finally {
      setLoading(false);
    }
  };

  const handleModify = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name || "",
      description: service.description || "",
    });
    setSelectedService(service._id);
  };

  const handleUpdateService = async () => {
    if (!editingService || !formData.name.trim()) {
      alert("Service name is required");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/services/${editingService._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();
      if (response.ok) {
        setEditingService(null);
        setFormData({ name: "", description: "" });
        setSelectedService(null);
        fetchServices();
      } else {
        alert(data.error || "Failed to update service");
      }
    } catch (error) {
      console.error("Error updating service:", error);
      alert("Failed to update service");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (serviceId) => {
    if (!confirm("Are you sure you want to remove this service?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/services/${serviceId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchServices();
        if (selectedService === serviceId) {
          setSelectedService(null);
          setEditingService(null);
          setFormData({ name: "", description: "" });
        }
      } else {
        const data = await response.json();
        alert(data.error || "Failed to remove service");
      }
    } catch (error) {
      console.error("Error removing service:", error);
      alert("Failed to remove service");
    } finally {
      setLoading(false);
    }
  };

  const sortedServices = [...services].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-card text-foreground shadow-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between rounded-t-lg border-b border-border bg-card px-6 py-4">
          <h2 className="text-xl font-semibold text-highlight">Add a Service</h2>
          <button
            onClick={onClose}
            className="text-muted transition-colors hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Add a Service Section */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Add a Service
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Service name:
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full rounded border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="Enter service name"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Description:
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full resize-none rounded border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="Enter service description"
                />
              </div>
              <div className="flex justify-center">
                <button
                  onClick={
                    editingService ? handleUpdateService : handleAddService
                  }
                  disabled={loading}
                  className="px-6 py-2 bg-[#004A4E] text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingService ? "Update" : "Add"}
                </button>
              </div>
            </div>
          </div>

          {/* My Services Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-highlight">
                My Services
              </h3>
              <div className="h-px flex-1 bg-border"></div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <label className="text-sm font-medium text-foreground">
                Sort by:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded border border-border bg-input px-3 py-1 text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                <option value="name">Name</option>
                <option value="date">Date</option>
              </select>
            </div>

            {loading && services.length === 0 ? (
              <div className="py-8 text-center text-muted">
                Loading services...
              </div>
            ) : sortedServices.length === 0 ? (
              <div className="py-8 text-center text-muted">
                No services yet. Add your first service above.
              </div>
            ) : (
              <div className="space-y-2">
                {sortedServices.map((service) => (
                  <div
                    key={service._id}
                    className="flex items-center gap-3 rounded border border-border p-3 hover:bg-muted-bg"
                  >
                    <input
                      type="radio"
                      name="service"
                      checked={selectedService === service._id}
                      onChange={() => setSelectedService(service._id)}
                      className="w-4 h-4 text-highlight"
                    />
                    <span className="flex-1 text-foreground">{service.name}</span>
                    <button
                      onClick={() => handleModify(service)}
                      className="px-3 py-1 bg-[#004A4E] text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Modify
                    </button>
                    <button
                      onClick={() => handleRemove(service._id)}
                      className="px-3 py-1 bg-[#004A4E] text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
