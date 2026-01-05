"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

export default function ProductModal({ isOpen, onClose }) {
  const brand = useBrandContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    description: "",
  });
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen, brand?.subdomain]);

  const fetchProducts = async () => {
    if (!brand?.subdomain) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/products?brand=${brand.subdomain}`
      );
      const data = await response.json();
      if (response.ok) {
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!formData.name.trim()) {
      alert("Product name is required");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          brand: brand?.subdomain,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setFormData({ name: "", url: "", description: "" });
        fetchProducts();
      } else {
        alert(data.error || "Failed to add product");
      }
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  const handleModify = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      url: product.url || "",
      description: product.description || "",
    });
    setSelectedProduct(product._id);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !formData.name.trim()) {
      alert("Product name is required");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/products/${editingProduct._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();
      if (response.ok) {
        setEditingProduct(null);
        setFormData({ name: "", url: "", description: "" });
        setSelectedProduct(null);
        fetchProducts();
      } else {
        alert(data.error || "Failed to update product");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId) => {
    if (!confirm("Are you sure you want to remove this product?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchProducts();
        if (selectedProduct === productId) {
          setSelectedProduct(null);
          setEditingProduct(null);
          setFormData({ name: "", url: "", description: "" });
        }
      } else {
        const data = await response.json();
        alert(data.error || "Failed to remove product");
      }
    } catch (error) {
      console.error("Error removing product:", error);
      alert("Failed to remove product");
    } finally {
      setLoading(false);
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center md:bg-black md:bg-opacity-50">
      <div className="bg-white shadow-xl w-full h-full md:rounded-2xl md:max-w-2xl md:mx-4 md:max-h-[90vh] md:h-auto overflow-y-auto">
        {/* Header */}
        <div className="relative px-6 pt-3 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title */}
        <div className="text-center pb-6">
          <h2 className="text-xl font-semibold text-[#4D5495]">
            Add a Product
          </h2>
        </div>

        <div className="px-8 pb-8 space-y-6">
          {/* Form Fields - Inline Layout */}
          <div className="space-y-4">
            <div className="flex items-center">
              <label className="w-28 text-sm text-gray-600 flex-shrink-0">
                Product name:
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="flex-1 px-3 py-2 border-b border-gray-300 focus:outline-none focus:border-[#4D5495]"
              />
            </div>
            <div className="flex items-center">
              <label className="w-28 text-sm text-gray-600 flex-shrink-0">
                URL:
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                className="flex-1 px-3 py-2 border-b border-gray-300 focus:outline-none focus:border-[#4D5495]"
              />
            </div>
            <div className="flex items-start">
              <label className="w-28 text-sm text-gray-600 flex-shrink-0 pt-2">
                Description:
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="flex-1 px-3 py-2 border-b border-gray-300 focus:outline-none focus:border-[#4D5495] resize-none"
              />
            </div>
          </div>

          {/* Add/Update Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={editingProduct ? handleUpdateProduct : handleAddProduct}
              disabled={loading}
              className="px-8 py-1 border shadow-md text-gray-700 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingProduct ? "Update" : "Add"}
            </button>
          </div>

          {/* My Products Section */}
          <div className="pt-4">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-[#4D5495] whitespace-nowrap">
                My Products
              </h3>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>

            {/* Products List */}
            {loading && products.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Loading products...
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No products yet. Add your first product above.
              </div>
            ) : (
              <div className="space-y-3">
                {sortedProducts.map((product) => (
                  <div
                    key={product._id}
                    className="flex items-center gap-4 py-2"
                  >
                    <input
                      type="radio"
                      name="product"
                      checked={selectedProduct === product._id}
                      onChange={() => setSelectedProduct(product._id)}
                      className="w-5 h-5 text-[#4D5495] border-2 border-gray-300"
                    />
                    <span className="flex-1 text-gray-800">{product.name}</span>
                    <button
                      onClick={() => handleModify(product)}
                      className="px-4 py-1.5 bg-[#4D5495] text-white text-sm rounded-xl hover:bg-[#4D5495] transition-colors"
                    >
                      Modify
                    </button>
                    <button
                      onClick={() => handleRemove(product._id)}
                      className="px-4 py-1.5 bg-[#4D5495] text-white text-sm rounded-xl hover:bg-[#4D5495] transition-colors"
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
