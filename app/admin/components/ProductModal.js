"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

export default function ProductModal({ isOpen, onClose }) {
  const brand = useBrandContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("name");
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
          <h2 className="text-xl font-semibold text-gray-900">Add a Product</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Add a Product Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add a Product
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product name:
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL:
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter product URL"
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
                  placeholder="Enter product description"
                />
              </div>
              <div className="flex justify-center">
                <button
                  onClick={
                    editingProduct ? handleUpdateProduct : handleAddProduct
                  }
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingProduct ? "Update" : "Add"}
                </button>
              </div>
            </div>
          </div>

          {/* My Products Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-blue-600">
                My Products
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

            {loading && products.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Loading products...
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No products yet. Add your first product above.
              </div>
            ) : (
              <div className="space-y-2">
                {sortedProducts.map((product) => (
                  <div
                    key={product._id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="product"
                      checked={selectedProduct === product._id}
                      onChange={() => setSelectedProduct(product._id)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="flex-1 text-gray-900">{product.name}</span>
                    <button
                      onClick={() => handleModify(product)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Modify
                    </button>
                    <button
                      onClick={() => handleRemove(product._id)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
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
