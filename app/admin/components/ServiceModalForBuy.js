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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-xl font-semibold text-gray-900">Add a Service</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Add a Service Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add a Service
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service name:
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter service name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description:
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
              <h3 className="text-lg font-semibold text-[#004A4E]">
                My Services
              </h3>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <label className="text-sm font-medium text-gray-700">
                Sort by:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Name</option>
                <option value="date">Date</option>
              </select>
            </div>

            {loading && services.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Loading services...
              </div>
            ) : sortedServices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No services yet. Add your first service above.
              </div>
            ) : (
              <div className="space-y-2">
                {sortedServices.map((service) => (
                  <div
                    key={service._id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="service"
                      checked={selectedService === service._id}
                      onChange={() => setSelectedService(service._id)}
                      className="w-4 h-4 text-[#004A4E]"
                    />
                    <span className="flex-1 text-gray-900">{service.name}</span>
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
